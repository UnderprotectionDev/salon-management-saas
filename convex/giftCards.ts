import { ConvexError, v } from "convex/values";
import { DATE_FORMAT_REGEX } from "./lib/constants";
import {
  ErrorCode,
  internalMutation,
  ownerMutation,
  ownerQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  giftCardDocValidator,
  giftCardStatusValidator,
} from "./lib/validators";

// Gift card code generator (8-char alphanumeric)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateGiftCardCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// =============================================================================
// Queries
// =============================================================================

export const list = ownerQuery({
  args: {
    status: v.optional(giftCardStatusValidator),
  },
  returns: v.array(giftCardDocValidator),
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("giftCards")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("status", args.status!),
        )
        .collect();
    }
    return ctx.db
      .query("giftCards")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});

export const get = ownerQuery({
  args: { id: v.id("giftCards") },
  returns: v.union(giftCardDocValidator, v.null()),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card || card.organizationId !== ctx.organizationId) return null;
    return card;
  },
});

// =============================================================================
// Mutations
// =============================================================================

export const create = ownerMutation({
  args: {
    purchaseDate: v.string(),
    purchaserName: v.optional(v.string()),
    amount: v.number(),
    expiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("giftCards"),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createGiftCard", { key: ctx.organizationId, throws: true });

    if (!DATE_FORMAT_REGEX.test(args.purchaseDate)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Date must be YYYY-MM-DD",
      });
    }
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }
    if (args.expiryDate && !DATE_FORMAT_REGEX.test(args.expiryDate)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Expiry date must be YYYY-MM-DD",
      });
    }

    // Generate unique code within this org
    let code = generateGiftCardCode();
    let codeIsUnique = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const existing = await ctx.db
        .query("giftCards")
        .withIndex("by_org_code", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("code", code),
        )
        .first();
      if (!existing) {
        codeIsUnique = true;
        break;
      }
      code = generateGiftCardCode();
    }
    if (!codeIsUnique) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Failed to generate unique gift card code after 10 attempts",
      });
    }

    return ctx.db.insert("giftCards", {
      organizationId: ctx.organizationId,
      code,
      purchaseDate: args.purchaseDate,
      purchaserName: args.purchaserName,
      amount: args.amount,
      remainingBalance: args.amount,
      status: "active",
      expiryDate: args.expiryDate,
      notes: args.notes,
    });
  },
});

export const update = ownerMutation({
  args: {
    id: v.id("giftCards"),
    purchaserName: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card || card.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Gift card not found",
      });
    }

    if (args.expiryDate && !DATE_FORMAT_REGEX.test(args.expiryDate)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Expiry date must be YYYY-MM-DD",
      });
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
    return null;
  },
});

export const redeem = ownerMutation({
  args: {
    id: v.id("giftCards"),
    amount: v.number(),
  },
  returns: v.number(), // remaining balance
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card || card.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Gift card not found",
      });
    }
    if (card.status !== "active") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Gift card is ${card.status}`,
      });
    }
    // Check expiry before allowing redemption
    if (card.expiryDate) {
      const today = new Date();
      const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
      if (card.expiryDate < todayStr) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Gift card has expired",
        });
      }
    }
    if (args.amount <= 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount must be positive",
      });
    }
    if (args.amount > card.remainingBalance) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Insufficient balance",
      });
    }

    const today = new Date();
    const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

    const newBalance = card.remainingBalance - args.amount;
    await ctx.db.patch(args.id, {
      remainingBalance: newBalance,
      status: newBalance === 0 ? "used" : "active",
      lastUsedDate: todayStr,
    });

    return newBalance;
  },
});

// =============================================================================
// Internal: Expire old gift cards (cron)
// =============================================================================

export const expireOld = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const today = new Date();
    const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

    // Find all active gift cards across all orgs
    const activeCards = await ctx.db
      .query("giftCards")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let expired = 0;
    for (const card of activeCards) {
      if (card.expiryDate && card.expiryDate < todayStr) {
        await ctx.db.patch(card._id, { status: "expired" });
        expired++;
      }
    }

    return expired;
  },
});
