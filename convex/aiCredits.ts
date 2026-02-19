/**
 * AI Credits — user-level balance management, purchases, and transaction history
 *
 * Credits are user-scoped (not org-scoped). Each user has a single global
 * credit pool shared across all salons.
 *
 * Atomic deduction: balance check + deduct + transaction log in a single mutation.
 */

import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  internalMutation,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  aiCreditBalanceValidator,
  aiCreditTransactionDocValidator,
  aiFeatureTypeValidator,
} from "./lib/validators";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Get or create a credit record for a user (global customer pool).
 */
async function getOrCreateCreditRecord(ctx: MutationCtx, userId: string) {
  const existing = await ctx.db
    .query("aiCredits")
    .withIndex("by_user_pool", (q) =>
      q.eq("userId", userId).eq("poolType", "customer"),
    )
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
  if (!doc) {
    throw new ConvexError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to create credit record",
    });
  }
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
    userId: v.string(),
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

    const record = await getOrCreateCreditRecord(ctx, args.userId);

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
 * Refund credits back to a user pool after a failed AI operation.
 */
export const refundCredits = internalMutation({
  args: {
    organizationId: v.optional(v.id("organization")),
    userId: v.string(),
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

    const record = await getOrCreateCreditRecord(ctx, args.userId);

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
 * Add purchased credits to a user pool (called from webhook handler).
 */
export const addPurchasedCredits = internalMutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    description: v.optional(v.string()),
    // Idempotency key — Polar orderId for purchases, prevents double-credit on webhook retry
    referenceId: v.optional(v.string()),
  },
  returns: v.id("aiCreditTransactions"),
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }

    // Idempotency guard: if a transaction with this referenceId already exists, skip
    if (args.referenceId) {
      const existing = await ctx.db
        .query("aiCreditTransactions")
        .withIndex("by_reference", (q) => q.eq("referenceId", args.referenceId))
        .first();
      if (existing) {
        console.log(
          `[AI Credits] Duplicate purchase detected, skipping (referenceId=${args.referenceId})`,
        );
        return existing._id;
      }
    }

    const record = await getOrCreateCreditRecord(ctx, args.userId);

    // Add credits
    await ctx.db.patch(record._id, {
      balance: record.balance + args.amount,
      updatedAt: Date.now(),
    });

    // Log purchase transaction
    const transactionId = await ctx.db.insert("aiCreditTransactions", {
      creditId: record._id,
      type: "purchase",
      amount: args.amount,
      referenceId: args.referenceId,
      description: args.description ?? `Purchased ${args.amount} credits`,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

/**
 * Check if a purchase order has already been credited (idempotency guard).
 * Used by addCreditsForOrder action before calling addPurchasedCredits mutation.
 */
export const isOrderProcessed = internalQuery({
  args: { orderId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiCreditTransactions")
      .withIndex("by_reference", (q) => q.eq("referenceId", args.orderId))
      .first();
    return existing !== null;
  },
});

// =============================================================================
// Authenticated Queries (user's own credits)
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
      .withIndex("by_user_pool", (q) =>
        q.eq("userId", ctx.user._id).eq("poolType", "customer"),
      )
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
      .withIndex("by_user_pool", (q) =>
        q.eq("userId", ctx.user._id).eq("poolType", "customer"),
      )
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

    const record = await getOrCreateCreditRecord(ctx, ctx.user._id);

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

// initiatePurchase is defined in aiCreditActions.ts (requires "use node" for Polar SDK)
