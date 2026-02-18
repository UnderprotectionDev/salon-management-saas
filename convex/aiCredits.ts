/**
 * AI Credits — user-level balance management, purchases, and transaction history
 *
 * Credits are user-scoped (not org-scoped). Each user has a single global
 * credit pool shared across all salons.
 *
 * Org pool still exists for credits purchased/allocated by salon owners.
 * Atomic deduction: balance check + deduct + transaction log in a single mutation.
 */

import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  internalMutation,
  orgMutation,
  orgQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  aiCreditBalanceValidator,
  aiCreditPoolTypeValidator,
  aiCreditTransactionDocValidator,
  aiFeatureTypeValidator,
} from "./lib/validators";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Get or create a credit record for a user (global pool, no org).
 * For org pool: requires organizationId.
 */
async function getOrCreateCreditRecord(
  ctx: MutationCtx,
  args: {
    organizationId?: Id<"organization">;
    userId?: string;
    poolType: "customer" | "org";
  },
) {
  const { organizationId, userId, poolType } = args;

  // User pool — looked up by userId, org-independent
  if (poolType === "customer" && userId) {
    const existing = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("poolType"), "customer"))
      .first();

    if (existing) return existing;

    const now = Date.now();
    const id = await ctx.db.insert("aiCredits", {
      userId,
      poolType: "customer",
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Failed to create credit record");
    return doc;
  }

  // Org pool — requires organizationId
  if (!organizationId) {
    throw new Error("organizationId required for org pool");
  }

  const existing = await ctx.db
    .query("aiCredits")
    .withIndex("by_org_pool", (q) =>
      q.eq("organizationId", organizationId).eq("poolType", "org"),
    )
    .first();

  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("aiCredits", {
    organizationId,
    poolType: "org",
    balance: 0,
    createdAt: now,
    updatedAt: now,
  });
  const doc = await ctx.db.get(id);
  if (!doc) throw new Error("Failed to create credit record");
  return doc;
}

// =============================================================================
// Internal Mutations (called by AI actions)
// =============================================================================

/**
 * Atomic credit deduction: check balance + deduct + log transaction.
 * Throws ConvexError if balance is insufficient.
 */
export const deductCredits = internalMutation({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()),
    poolType: aiCreditPoolTypeValidator,
    amount: v.number(),
    featureType: aiFeatureTypeValidator,
    referenceId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("aiCreditTransactions"),
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }

    const record = await getOrCreateCreditRecord(ctx, {
      organizationId: args.organizationId,
      userId: args.userId,
      poolType: args.poolType,
    });

    if (record.balance < args.amount) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Insufficient credits",
      });
    }

    // Deduct balance
    await ctx.db.patch(record._id, {
      balance: record.balance - args.amount,
      updatedAt: Date.now(),
    });

    // Log transaction
    const transactionId = await ctx.db.insert("aiCreditTransactions", {
      organizationId: args.organizationId,
      creditId: record._id,
      type: "usage",
      amount: -args.amount,
      featureType: args.featureType,
      referenceId: args.referenceId,
      description: args.description,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

/**
 * Refund credits back to a pool after a failed AI operation.
 */
export const refundCredits = internalMutation({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()),
    poolType: aiCreditPoolTypeValidator,
    amount: v.number(),
    featureType: aiFeatureTypeValidator,
    referenceId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("aiCreditTransactions"),
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }

    const record = await getOrCreateCreditRecord(ctx, {
      organizationId: args.organizationId,
      userId: args.userId,
      poolType: args.poolType,
    });

    // Restore balance
    await ctx.db.patch(record._id, {
      balance: record.balance + args.amount,
      updatedAt: Date.now(),
    });

    // Log refund transaction
    const transactionId = await ctx.db.insert("aiCreditTransactions", {
      organizationId: args.organizationId,
      creditId: record._id,
      type: "refund",
      amount: args.amount,
      featureType: args.featureType,
      referenceId: args.referenceId,
      description: args.description ?? "Refund for failed operation",
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

/**
 * Add purchased credits to a pool (called from webhook handler).
 */
export const addPurchasedCredits = internalMutation({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()),
    poolType: aiCreditPoolTypeValidator,
    amount: v.number(),
    description: v.optional(v.string()),
  },
  returns: v.id("aiCreditTransactions"),
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }

    const record = await getOrCreateCreditRecord(ctx, {
      organizationId: args.organizationId,
      userId: args.userId,
      poolType: args.poolType,
    });

    // Add credits
    await ctx.db.patch(record._id, {
      balance: record.balance + args.amount,
      updatedAt: Date.now(),
    });

    // Log purchase transaction
    const transactionId = await ctx.db.insert("aiCreditTransactions", {
      organizationId: args.organizationId,
      creditId: record._id,
      type: "purchase",
      amount: args.amount,
      description: args.description ?? `Purchased ${args.amount} credits`,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

// =============================================================================
// Authenticated Queries (user's own credits, no org needed)
// =============================================================================

/**
 * Get current credit balance for the authenticated user (global pool).
 */
export const getMyBalance = authedQuery({
  args: {},
  returns: aiCreditBalanceValidator,
  handler: async (ctx) => {
    const record = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .filter((q) => q.eq(q.field("poolType"), "customer"))
      .first();

    if (!record) return { balance: 0, poolType: "customer" as const };
    return { balance: record.balance, poolType: record.poolType };
  },
});

/**
 * Get transaction history for the authenticated user.
 */
export const getMyTransactionHistory = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiCreditTransactionDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const creditRecord = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .filter((q) => q.eq(q.field("poolType"), "customer"))
      .first();

    if (!creditRecord) return [];

    return await ctx.db
      .query("aiCreditTransactions")
      .withIndex("by_credit", (q) => q.eq("creditId", creditRecord._id))
      .order("desc")
      .take(limit);
  },
});

/**
 * Claim free test credits (100 credits).
 * For development/testing only — requires ALLOW_TEST_CREDITS=true env var.
 * Rate-limited to 3 claims per day per user.
 */
export const claimTestCredits = authedMutation({
  args: {},
  returns: v.object({ newBalance: v.number() }),
  handler: async (ctx) => {
    if (process.env.ALLOW_TEST_CREDITS !== "true") {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Test credits are not available in this environment",
      });
    }

    await rateLimiter.limit(ctx, "aiClaimTestCredits", {
      key: ctx.user._id,
      throws: true,
    });

    const record = await getOrCreateCreditRecord(ctx, {
      userId: ctx.user._id,
      poolType: "customer",
    });

    const amount = 100;
    const newBalance = record.balance + amount;

    await ctx.db.patch(record._id, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("aiCreditTransactions", {
      creditId: record._id,
      type: "purchase",
      amount,
      description: "Test credits (dev)",
      createdAt: Date.now(),
    });

    return { newBalance };
  },
});

/**
 * Initiate a credit purchase via Polar one-time checkout.
 * Returns a checkout URL.
 */
export const initiatePurchase = authedMutation({
  args: {
    packageId: v.union(
      v.literal("starter"),
      v.literal("popular"),
      v.literal("pro"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Rate limit
    await rateLimiter.limit(ctx, "aiCreditPurchase", {
      key: ctx.user._id,
      throws: true,
    });

    // TODO: Integrate with Polar one-time checkout
    console.log(
      `[AI Credits] Purchase initiated: package=${args.packageId} user=${ctx.user._id}`,
    );

    return null;
  },
});

// =============================================================================
// Org-scoped Queries (for org credit management by owners)
// =============================================================================

/**
 * Get org credit balance (for owner dashboard).
 */
export const getOrgBalance = orgQuery({
  args: {},
  returns: aiCreditBalanceValidator,
  handler: async (ctx) => {
    const record = await ctx.db
      .query("aiCredits")
      .withIndex("by_org_pool", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("poolType", "org"),
      )
      .first();

    if (!record) return { balance: 0, poolType: "org" as const };
    return { balance: record.balance, poolType: record.poolType };
  },
});

/**
 * Get org transaction history (for owner).
 */
export const getOrgTransactionHistory = orgQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiCreditTransactionDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("aiCreditTransactions")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Add credits to org pool (owner action, e.g. manual top-up).
 */
export const addOrgCredits = orgMutation({
  args: {
    amount: v.number(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }

    const record = await getOrCreateCreditRecord(ctx, {
      organizationId: ctx.organizationId,
      poolType: "org",
    });

    await ctx.db.patch(record._id, {
      balance: record.balance + args.amount,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("aiCreditTransactions", {
      organizationId: ctx.organizationId,
      creditId: record._id,
      type: "purchase",
      amount: args.amount,
      description: args.description ?? `Added ${args.amount} org credits`,
      createdAt: Date.now(),
    });

    return null;
  },
});

// =============================================================================
// Public Queries (for legacy / public booking flow compatibility)
// =============================================================================

/**
 * Check credit balance by userId — authenticated, self-access only.
 */
export const getBalanceByUser = authedQuery({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.string(),
  },
  returns: aiCreditBalanceValidator,
  handler: async (ctx, args) => {
    if (args.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied",
      });
    }

    const record = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("poolType"), "customer"))
      .first();

    if (!record) return { balance: 0, poolType: "customer" as const };
    return { balance: record.balance, poolType: record.poolType };
  },
});

// Legacy org-scoped queries (kept for org credit manager UI)
export const getBalance = orgQuery({
  args: {},
  returns: aiCreditBalanceValidator,
  handler: async (ctx) => {
    const record = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .filter((q) => q.eq(q.field("poolType"), "customer"))
      .first();

    if (!record) return { balance: 0, poolType: "customer" as const };
    return { balance: record.balance, poolType: record.poolType };
  },
});

export const getTransactionHistory = orgQuery({
  args: {
    limit: v.optional(v.number()),
    filterType: v.optional(
      v.union(v.literal("purchase"), v.literal("usage"), v.literal("refund")),
    ),
  },
  returns: v.array(aiCreditTransactionDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const creditRecord = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .filter((q) => q.eq(q.field("poolType"), "customer"))
      .first();

    if (!creditRecord) return [];

    const transactions = await ctx.db
      .query("aiCreditTransactions")
      .withIndex("by_credit", (q) => q.eq("creditId", creditRecord._id))
      .order("desc")
      .take(limit);

    if (args.filterType) {
      return transactions.filter((t) => t.type === args.filterType);
    }

    return transactions;
  },
});
