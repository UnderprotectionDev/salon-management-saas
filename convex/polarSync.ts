import { PolarCore } from "@polar-sh/sdk/core.js";
import { productsList } from "@polar-sh/sdk/funcs/productsList.js";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation } from "./_generated/server";
import { ErrorCode } from "./lib/functions";
import { publicQuery } from "./lib/functions";
import { polar } from "./polar";

// =============================================================================
// Sync Actions
// =============================================================================

export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
    await fetchAndStoreBenefits(ctx);
  },
});

export const triggerSync = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: ErrorCode.UNAUTHENTICATED,
        message: "Authentication required to trigger sync",
      });
    }
    await polar.syncProducts(ctx);
    await fetchAndStoreBenefits(ctx);
  },
});

async function fetchAndStoreBenefits(ctx: {
  runMutation: (
    ref: typeof internal.polarSync.upsertBenefits,
    args: {
      items: Array<{ polarProductId: string; benefits: string[] }>;
    },
  ) => Promise<null>;
}) {
  const token = process.env.POLAR_ORGANIZATION_TOKEN;
  const server = process.env.POLAR_SERVER as
    | "sandbox"
    | "production"
    | undefined;
  if (!token) {
    console.warn(
      "POLAR_ORGANIZATION_TOKEN not configured, skipping benefits sync",
    );
    return;
  }

  const client = new PolarCore({
    accessToken: token,
    server: server ?? "production",
  });
  const result = await productsList(client, {});
  if (!result.ok) {
    console.error("Failed to fetch products from Polar:", result.error);
    return;
  }

  const items: Array<{ polarProductId: string; benefits: string[] }> = [];

  for (const product of result.value.result.items) {
    const benefits = product.benefits.map((b) => b.description);
    items.push({ polarProductId: product.id, benefits });
  }

  if (items.length > 0) {
    await ctx.runMutation(internal.polarSync.upsertBenefits, { items });
  }
}

// =============================================================================
// Internal Mutations
// =============================================================================

export const upsertBenefits = internalMutation({
  args: {
    items: v.array(
      v.object({
        polarProductId: v.string(),
        benefits: v.array(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const existing = await ctx.db
        .query("productBenefits")
        .withIndex("polarProductId", (q) =>
          q.eq("polarProductId", item.polarProductId),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { benefits: item.benefits });
      } else {
        await ctx.db.insert("productBenefits", {
          polarProductId: item.polarProductId,
          benefits: item.benefits,
        });
      }
    }
    return null;
  },
});

// =============================================================================
// Queries
// =============================================================================

export const getProductBenefits = publicQuery({
  args: {},
  returns: v.array(
    v.object({
      polarProductId: v.string(),
      benefits: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const all = await ctx.db.query("productBenefits").collect();
    return all.map((doc) => ({
      polarProductId: doc.polarProductId,
      benefits: doc.benefits,
    }));
  },
});
