/**
 * AI Photo Analysis — create, retrieve, and list photo analyses
 *
 * User-scoped: analyses belong to the user, not an org.
 * organizationId is optional — when provided, enables service matching from
 * that salon's catalog. Credits are deducted from the user's global pool.
 */

import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery } from "./_generated/server";
import { CREDIT_COSTS } from "./lib/aiConstants";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  internalMutation,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  aiAnalysisDocValidator,
  aiAnalysisResultValidator,
  aiAnalysisStatusValidator,
  salonTypeValidator,
} from "./lib/validators";

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new photo analysis request.
 * Deducts credits from the user's global pool, then schedules the AI action.
 * organizationId is optional — used for service matching if provided.
 */
export const createAnalysis = authedMutation({
  args: {
    organizationId: v.optional(v.id("organization")),
    imageStorageIds: v.array(v.id("_storage")),
    salonType: salonTypeValidator,
  },
  returns: v.id("aiAnalyses"),
  handler: async (ctx, args) => {
    const { organizationId, imageStorageIds, salonType } = args;
    const userId = ctx.user._id;

    if (imageStorageIds.length === 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "At least one image is required",
      });
    }

    if (imageStorageIds.length > 3) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Maximum 3 images allowed",
      });
    }

    // Validate each uploaded file: type and size
    const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    for (const storageId of imageStorageIds) {
      const metadata = await ctx.storage.getMetadata(storageId);
      if (!metadata) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid image file",
        });
      }
      if (!ALLOWED_TYPES.has(metadata.contentType ?? "")) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Only JPEG, PNG, and WebP images are allowed",
        });
      }
      if (metadata.size > MAX_SIZE_BYTES) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Each image must be 5 MB or smaller",
        });
      }
    }

    // Rate limit by user
    await rateLimiter.limit(ctx, "aiPhotoAnalysis", {
      key: userId,
      throws: true,
    });

    const creditCost =
      imageStorageIds.length > 1
        ? CREDIT_COSTS.photoAnalysisMulti
        : CREDIT_COSTS.photoAnalysisSingle;

    // Deduct credits from user's global pool
    await ctx.runMutation(internal.aiCredits.deductCredits, {
      userId,
      amount: creditCost,
      featureType: "photoAnalysis",
      description: `Photo analysis (${imageStorageIds.length} image${imageStorageIds.length > 1 ? "s" : ""})`,
    });

    const now = Date.now();

    const analysisId = await ctx.db.insert("aiAnalyses", {
      organizationId,
      userId,
      imageStorageIds,
      salonType,
      status: "pending",
      creditCost,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.aiActions.runPhotoAnalysis, {
      analysisId,
    });

    return analysisId;
  },
});

/**
 * Ask a quick follow-up question about a completed analysis.
 * Deducts 2 credits from the user's global pool.
 */
export const askQuickQuestion = authedMutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    organizationId: v.optional(v.id("organization")),
    questionKey: v.string(),
    questionText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = ctx.user._id;

    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Analysis not found",
      });
    }

    // Security: only the owner can ask questions
    if (analysis.userId !== userId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied",
      });
    }

    if (analysis.status !== "completed" || !analysis.result) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Analysis must be completed before asking questions",
      });
    }

    // Deduct credits from user's global pool
    await ctx.runMutation(internal.aiCredits.deductCredits, {
      userId,
      amount: CREDIT_COSTS.quickQuestion,
      featureType: "quickQuestion",
      referenceId: args.analysisId,
      description: `Quick question: ${args.questionText}`,
    });

    // Mark question as loading
    const currentAnswers =
      (analysis.quickAnswers as Record<string, string> | undefined) ?? {};
    await ctx.db.patch(args.analysisId, {
      quickAnswers: { ...currentAnswers, [args.questionKey]: "__loading__" },
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.aiActions.runQuickQuestion, {
      analysisId: args.analysisId,
      organizationId: args.organizationId ?? undefined,
      userId,
      questionKey: args.questionKey,
      questionText: args.questionText,
    });

    return null;
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a single analysis by ID (for real-time status polling).
 * Only the owner can view their own analysis.
 */
export const getAnalysis = authedQuery({
  args: {
    analysisId: v.id("aiAnalyses"),
  },
  returns: v.union(aiAnalysisDocValidator, v.null()),
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.userId !== ctx.user._id) {
      return null;
    }
    return analysis;
  },
});

/**
 * List analyses for the authenticated user (newest first).
 */
export const listMyAnalyses = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiAnalysisDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("aiAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(limit);
  },
});

// Used by staff to view a customer's analysis history.
// Requires auth: caller must be the user themselves OR a member of the org.
export const listByUser = authedQuery({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(aiAnalysisDocValidator),
  handler: async (ctx, args) => {
    const callerId = ctx.user._id;

    // Self-access is always allowed
    if (callerId !== args.userId) {
      // Otherwise, the caller must be a member of the given org
      if (!args.organizationId) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message: "Cannot access another user's analyses without org context",
        });
      }
      const orgId = args.organizationId;
      const membership = await ctx.db
        .query("member")
        .withIndex("organizationId_userId", (q) =>
          q.eq("organizationId", orgId).eq("userId", callerId),
        )
        .first();
      if (!membership) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message: "Not a member of this organization",
        });
      }
    }

    const limit = args.limit ?? 20;
    return await ctx.db
      .query("aiAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// =============================================================================
// Internal Functions (called by aiActions)
// =============================================================================

export const getAnalysisInternal = internalQuery({
  args: { analysisId: v.id("aiAnalyses") },
  returns: v.union(aiAnalysisDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.analysisId);
  },
});

export const getActiveServicesInternal = internalQuery({
  args: { organizationId: v.id("organization") },
  returns: v.array(
    v.object({
      _id: v.id("services"),
      name: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();
    return services.map((s) => ({ _id: s._id, name: s.name }));
  },
});

export const updateAnalysisStatus = internalMutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    status: aiAnalysisStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const completeAnalysis = internalMutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    result: aiAnalysisResultValidator,
    recommendedServiceIds: v.array(v.id("services")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      status: "completed",
      result: args.result,
      recommendedServiceIds: args.recommendedServiceIds,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failAnalysis = internalMutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setAnalysisThreadId = internalMutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    agentThreadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, { agentThreadId: args.agentThreadId });
    return null;
  },
});

export const saveQuickAnswer = internalMutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    questionKey: v.string(),
    answer: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) return null;

    const currentAnswers =
      (analysis.quickAnswers as Record<string, string> | undefined) ?? {};

    await ctx.db.patch(args.analysisId, {
      quickAnswers: { ...currentAnswers, [args.questionKey]: args.answer },
      updatedAt: Date.now(),
    });
    return null;
  },
});
