import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerMutation, ownerQuery } from "./lib/functions";
import {
  commissionModelValidator,
  commissionSettingsDocValidator,
  commissionTierValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

export const listByOrg = ownerQuery({
  args: {},
  returns: v.array(commissionSettingsDocValidator),
  handler: async (ctx) => {
    return ctx.db
      .query("commissionSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});

export const getForStaff = ownerQuery({
  args: { staffId: v.id("staff") },
  returns: v.union(commissionSettingsDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db
      .query("commissionSettings")
      .withIndex("by_org_staff", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("staffId", args.staffId),
      )
      .first();
  },
});

// =============================================================================
// Mutations
// =============================================================================

export const upsert = ownerMutation({
  args: {
    staffId: v.id("staff"),
    model: commissionModelValidator,
    fixedRate: v.optional(v.number()),
    tiers: v.optional(v.array(commissionTierValidator)),
  },
  returns: v.id("commissionSettings"),
  handler: async (ctx, args) => {
    // Validate staff belongs to org
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    // Validate model-specific fields
    if (args.model === "fixed") {
      if (
        args.fixedRate === undefined ||
        args.fixedRate < 0 ||
        args.fixedRate > 100
      ) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Fixed rate must be between 0 and 100",
        });
      }
    } else if (args.model === "tiered") {
      if (!args.tiers || args.tiers.length === 0) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Tiered model requires at least one tier",
        });
      }
      for (const tier of args.tiers) {
        if (tier.rate < 0 || tier.rate > 100) {
          throw new ConvexError({
            code: ErrorCode.VALIDATION_ERROR,
            message: "Tier rate must be between 0 and 100",
          });
        }
      }
    }

    const existing = await ctx.db
      .query("commissionSettings")
      .withIndex("by_org_staff", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("staffId", args.staffId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        model: args.model,
        fixedRate: args.model === "fixed" ? args.fixedRate : undefined,
        tiers: args.model === "tiered" ? args.tiers : undefined,
      });
      return existing._id;
    }

    return ctx.db.insert("commissionSettings", {
      organizationId: ctx.organizationId,
      staffId: args.staffId,
      model: args.model,
      fixedRate: args.model === "fixed" ? args.fixedRate : undefined,
      tiers: args.model === "tiered" ? args.tiers : undefined,
    });
  },
});
