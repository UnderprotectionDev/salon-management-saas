/**
 * AI Mood Board — save and manage favorite looks and styles
 *
 * User-scoped: mood board belongs to the user, not an org.
 * Zero credit cost — saving is free.
 */

import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import {
  aiMoodBoardDocValidator,
  aiMoodBoardSourceValidator,
} from "./lib/validators";

// =============================================================================
// Mutations
// =============================================================================

/**
 * Add an item to the mood board.
 */
export const addToMoodBoard = authedMutation({
  args: {
    imageStorageId: v.id("_storage"),
    source: aiMoodBoardSourceValidator,
    analysisId: v.optional(v.id("aiAnalyses")),
    simulationId: v.optional(v.id("aiSimulations")),
    designCatalogId: v.optional(v.id("designCatalog")),
    organizationId: v.optional(v.id("organization")),
    note: v.optional(v.string()),
  },
  returns: v.id("aiMoodBoard"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("aiMoodBoard", {
      userId: ctx.user._id,
      imageStorageId: args.imageStorageId,
      source: args.source,
      analysisId: args.analysisId,
      simulationId: args.simulationId,
      designCatalogId: args.designCatalogId,
      organizationId: args.organizationId,
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a mood board item's note.
 */
export const updateNote = authedMutation({
  args: {
    itemId: v.id("aiMoodBoard"),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Mood board item not found",
      });
    }

    // Security: only the owner can update
    if (item.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied",
      });
    }

    await ctx.db.patch(args.itemId, {
      note: args.note,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Remove an item from the mood board.
 */
export const removeFromMoodBoard = authedMutation({
  args: {
    itemId: v.id("aiMoodBoard"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Mood board item not found",
      });
    }

    // Security: only the owner can delete
    if (item.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied",
      });
    }

    await ctx.db.delete(args.itemId);
    return null;
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * List mood board items for the authenticated user (newest first).
 */
export const listMyMoodBoard = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiMoodBoardDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("aiMoodBoard")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(limit);
  },
});

/**
 * Legacy: list mood board items for a user (backward compat).
 * Kept so existing components still compile.
 */
export const listMoodBoard = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiMoodBoardDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("aiMoodBoard")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(limit);
  },
});
