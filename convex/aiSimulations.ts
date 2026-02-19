/**
 * AI Simulations — virtual try-on creation, retrieval, and gallery management
 *
 * User-scoped: simulations belong to the user, not an org.
 * organizationId is optional — needed when submitting to a salon gallery.
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
  ownerMutation,
  ownerQuery,
  publicQuery,
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
      poolType: "customer",
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

/**
 * Submit a completed try-on to a salon's public gallery (user consent).
 * organizationId must be provided for gallery submission.
 */
export const submitToGallery = authedMutation({
  args: {
    simulationId: v.id("aiSimulations"),
    organizationId: v.id("organization"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Simulation not found",
      });
    }

    // Security: only the owner can submit their simulation
    if (simulation.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied",
      });
    }

    if (simulation.status !== "completed") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Only completed simulations can be submitted to gallery",
      });
    }

    await ctx.db.patch(args.simulationId, {
      organizationId: args.organizationId,
      publicConsent: true,
      galleryApprovedByOrg: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Approve a gallery submission (owner only).
 */
export const approveGalleryItem = ownerMutation({
  args: {
    simulationId: v.id("aiSimulations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation || simulation.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Simulation not found",
      });
    }

    if (!simulation.publicConsent) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Simulation was not submitted to gallery",
      });
    }

    await ctx.db.patch(args.simulationId, {
      galleryApprovedByOrg: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Reject a gallery submission (owner only).
 */
export const rejectGalleryItem = ownerMutation({
  args: {
    simulationId: v.id("aiSimulations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation || simulation.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Simulation not found",
      });
    }

    await ctx.db.patch(args.simulationId, {
      publicConsent: false,
      galleryApprovedByOrg: false,
      updatedAt: Date.now(),
    });
    return null;
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

/**
 * List gallery submissions pending moderation (owner only).
 */
export const listGalleryPending = ownerQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiSimulationDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("aiSimulations")
      .withIndex("by_org_gallery", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("publicConsent", true)
          .eq("galleryApprovedByOrg", false),
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * List approved gallery items for public display.
 * Includes design attribution (design name, staff name) when available.
 */
export const listGalleryApproved = publicQuery({
  args: {
    organizationId: v.id("organization"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("aiSimulations"),
      simulationType: aiSimulationTypeValidator,
      resultImageUrl: v.union(v.string(), v.null()),
      designCatalogId: v.optional(v.id("designCatalog")),
      designName: v.optional(v.string()),
      staffName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const items = await ctx.db
      .query("aiSimulations")
      .withIndex("by_org_gallery", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("publicConsent", true)
          .eq("galleryApprovedByOrg", true),
      )
      .order("desc")
      .take(limit);

    // Pre-fetch unique design catalog IDs to avoid N+1
    const designIds = [
      ...new Set(
        items
          .map((i) => i.designCatalogId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];
    const designDocs = await Promise.all(designIds.map((id) => ctx.db.get(id)));
    const designMap = new Map(
      designDocs
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => [d._id, d]),
    );

    // Pre-fetch unique staff IDs
    const staffIds = [
      ...new Set(
        designDocs
          .filter((d): d is NonNullable<typeof d> => d !== null)
          .map((d) => d.createdByStaffId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];
    const staffDocs = await Promise.all(staffIds.map((id) => ctx.db.get(id)));
    const staffMap = new Map(
      staffDocs
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => [s._id, s]),
    );

    return await Promise.all(
      items.map(async (item) => {
        const design = item.designCatalogId
          ? designMap.get(item.designCatalogId)
          : undefined;
        const staff = design?.createdByStaffId
          ? staffMap.get(design.createdByStaffId)
          : undefined;

        return {
          _id: item._id,
          simulationType: item.simulationType,
          resultImageUrl: item.resultImageStorageId
            ? await ctx.storage.getUrl(item.resultImageStorageId)
            : null,
          designCatalogId: item.designCatalogId,
          designName: design?.name,
          staffName: staff?.name,
        };
      }),
    );
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
