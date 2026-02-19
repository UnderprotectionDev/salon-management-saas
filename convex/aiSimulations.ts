/**
 * AI Simulations — virtual try-on creation and retrieval
 *
 * User-scoped: simulations belong to the user, not an org.
 * Credits are deducted from the user's global pool.
 */

import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery } from "./_generated/server";
import { CREDIT_COSTS, deriveEffectiveSalonType } from "./lib/aiConstants";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  internalMutation,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  aiSimulationDocValidator,
  aiSimulationTypeValidator,
  salonTypeValidator,
} from "./lib/validators";

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new virtual try-on simulation.
 * Deducts 10 credits from the user's global pool.
 * organizationId is optional — if provided with a designCatalogId, the catalog
 * entry is validated against that org.
 */
export const createSimulation = authedMutation({
  args: {
    organizationId: v.optional(v.id("organization")),
    imageStorageId: v.id("_storage"),
    simulationType: aiSimulationTypeValidator,
    designCatalogId: v.optional(v.id("designCatalog")),
    promptText: v.optional(v.string()),
  },
  returns: v.id("aiSimulations"),
  handler: async (ctx, args) => {
    const {
      organizationId,
      imageStorageId,
      simulationType,
      designCatalogId,
      promptText,
    } = args;
    const userId = ctx.user._id;

    if (simulationType === "catalog" && !designCatalogId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Design catalog ID is required for catalog mode",
      });
    }
    if (simulationType === "prompt" && !promptText) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Prompt text is required for prompt mode",
      });
    }

    // Validate designCatalogId belongs to the specified organization
    if (designCatalogId && organizationId) {
      const design = await ctx.db.get(designCatalogId);
      if (!design || design.organizationId !== organizationId) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message:
            "Design catalog entry not found or does not belong to this organization",
        });
      }
    }

    // Validate source photo: type and size
    const imageMetadata = await ctx.storage.getMetadata(imageStorageId);
    if (!imageMetadata) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid image file",
      });
    }
    const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!ALLOWED_TYPES.has(imageMetadata.contentType ?? "")) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Only JPEG, PNG, and WebP images are allowed",
      });
    }
    if (imageMetadata.size > 5 * 1024 * 1024) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Image must be 5 MB or smaller",
      });
    }

    await rateLimiter.limit(ctx, "aiVirtualTryOn", {
      key: userId,
      throws: true,
    });

    // Deduct credits from user's global pool
    await ctx.runMutation(internal.aiCredits.deductCredits, {
      userId,
      amount: CREDIT_COSTS.virtualTryOn,
      featureType: "virtualTryOn",
      description: `Virtual try-on (${simulationType})`,
    });

    const now = Date.now();

    const simulationId = await ctx.db.insert("aiSimulations", {
      organizationId,
      userId,
      imageStorageId,
      simulationType,
      designCatalogId,
      promptText,
      status: "pending",
      creditCost: CREDIT_COSTS.virtualTryOn,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.aiActions.runVirtualTryOn, {
      simulationId,
    });

    return simulationId;
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get a single simulation by ID (for real-time status polling).
 * Only the owner can view their own simulation.
 */
export const getSimulation = authedQuery({
  args: {
    simulationId: v.id("aiSimulations"),
  },
  returns: v.union(aiSimulationDocValidator, v.null()),
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation || simulation.userId !== ctx.user._id) {
      return null;
    }
    return simulation;
  },
});

/**
 * List simulations for the authenticated user (newest first).
 */
export const listMySimulations = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiSimulationDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("aiSimulations")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(limit);
  },
});

// Used by staff to view a customer's simulation history.
// Requires auth: caller must be the user themselves OR a member of the org.
export const listByUser = authedQuery({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(aiSimulationDocValidator),
  handler: async (ctx, args) => {
    const callerId = ctx.user._id;

    // Self-access is always allowed
    if (callerId !== args.userId) {
      // Otherwise, the caller must be a member of the given org
      if (!args.organizationId) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message:
            "Cannot access another user's simulations without org context",
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
      .query("aiSimulations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// =============================================================================
// Internal Functions (called by aiActions)
// =============================================================================

export const getSimulationInternal = internalQuery({
  args: { simulationId: v.id("aiSimulations") },
  returns: v.union(aiSimulationDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.simulationId);
  },
});

export const getOrgInternal = internalQuery({
  args: { organizationId: v.id("organization") },
  returns: v.union(
    v.object({
      salonType: v.optional(salonTypeValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) return null;
    // Normalize from legacy string or new array format, then derive effective AI type
    const rawType = org.salonType as string | string[] | undefined | null;
    const typesArr: Parameters<typeof deriveEffectiveSalonType>[0] =
      Array.isArray(rawType)
        ? (rawType as Parameters<typeof deriveEffectiveSalonType>[0])
        : rawType === "multi"
          ? ["hair", "nail", "makeup"]
          : rawType
            ? ([rawType] as Parameters<typeof deriveEffectiveSalonType>[0])
            : null;
    const effectiveType = deriveEffectiveSalonType(typesArr) ?? undefined;
    return { salonType: effectiveType };
  },
});

export const getDesignInternal = internalQuery({
  args: { designId: v.id("designCatalog") },
  returns: v.union(
    v.object({
      _id: v.id("designCatalog"),
      imageStorageId: v.id("_storage"),
      name: v.string(),
      category: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design) return null;
    return {
      _id: design._id,
      imageStorageId: design.imageStorageId,
      name: design.name,
      category: design.category,
    };
  },
});

export const updateSimulationStatus = internalMutation({
  args: {
    simulationId: v.id("aiSimulations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const completeSimulation = internalMutation({
  args: {
    simulationId: v.id("aiSimulations"),
    resultImageStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      status: "completed",
      resultImageStorageId: args.resultImageStorageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failSimulation = internalMutation({
  args: {
    simulationId: v.id("aiSimulations"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    return null;
  },
});
