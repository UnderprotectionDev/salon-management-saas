"use node";

/**
 * AI Credit Actions — Node.js runtime actions for Polar one-time checkout.
 *
 * Separated from aiCredits.ts because Polar SDK requires the Node.js runtime
 * ("use node") while aiCredits.ts mutations run in the Convex runtime.
 */

import { Buffer as BufferPolyfill } from "node:buffer";

globalThis.Buffer = BufferPolyfill;

import { PolarCore } from "@polar-sh/sdk/core.js";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { customersCreate } from "@polar-sh/sdk/funcs/customersCreate.js";
import { customersGet } from "@polar-sh/sdk/funcs/customersGet.js";
import { customersList } from "@polar-sh/sdk/funcs/customersList.js";
import { productsGet } from "@polar-sh/sdk/funcs/productsGet.js";
import { ConvexError, v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { ErrorCode } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import { polar } from "./polar";

// =============================================================================
// Credit Package → Polar Product ID mapping
// Env vars: POLAR_CREDIT_PRODUCT_STARTER, POLAR_CREDIT_PRODUCT_POPULAR, POLAR_CREDIT_PRODUCT_PRO
// =============================================================================

/**
 * Strip common Polar ID prefixes (e.g. "prod_xxx" → "xxx").
 * The Polar SDK validates product IDs as UUIDs — the "prod_" prefix
 * shown in the dashboard is for display only and must be removed.
 */
function stripPolarPrefix(id: string): string {
  return id.replace(/^prod_/, "");
}

const PACKAGE_PRODUCT_IDS: Record<string, string> = {
  starter: stripPolarPrefix(process.env.POLAR_CREDIT_PRODUCT_STARTER ?? ""),
  popular: stripPolarPrefix(process.env.POLAR_CREDIT_PRODUCT_POPULAR ?? ""),
  pro: stripPolarPrefix(process.env.POLAR_CREDIT_PRODUCT_PRO ?? ""),
};

function createPolarClient() {
  const accessToken = process.env.POLAR_ORGANIZATION_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ORGANIZATION_TOKEN is not set");
  }
  const serverEnv = process.env.POLAR_SERVER;
  const server: "sandbox" | "production" =
    serverEnv === "sandbox" ? "sandbox" : "production";
  return new PolarCore({ accessToken, server });
}

// biome-ignore lint/suspicious/noExplicitAny: Convex action ctx type
async function resolveCustomerId(ctx: any, client: PolarCore) {
  const user = await ctx.runQuery(api.users.getCurrentUser);
  if (!user) throw new Error("User not authenticated");

  const userId = user._id as string;
  if (!user.email) {
    throw new Error("User email is required");
  }
  const email = user.email;

  // Look up existing Polar customer in DB (same helper as polarActions.ts)
  const dbCustomer = await polar.getCustomerByUserId(ctx, userId);
  let customerId = dbCustomer?.id;

  // Verify customer still exists in Polar (may have been deleted)
  if (customerId) {
    const verifyResult = await customersGet(client, { id: customerId });
    if (!verifyResult.ok) {
      console.warn(
        "[AI Credits] Polar customer no longer valid, recreating:",
        customerId,
      );
      customerId = undefined;
    }
  }

  if (!customerId) {
    const createResult = await customersCreate(client, {
      email,
      metadata: { userId },
    });

    if (createResult.ok) {
      customerId = createResult.value.id;
    } else {
      // Email already exists — look up the existing customer
      const listResult = await customersList(client, { email });
      if (listResult.ok && listResult.value.result.items.length > 0) {
        const sorted = [...listResult.value.result.items].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
        customerId = sorted[0].id;
      } else {
        throw new Error(
          `Failed to resolve Polar customer: ${JSON.stringify(createResult.error)}`,
        );
      }
    }

    // Persist to DB — best-effort, customerId is already known so failures are non-fatal
    try {
      await ctx.runMutation(components.polar.lib.upsertCustomer, {
        id: customerId,
        userId,
      });
    } catch (error: unknown) {
      // upsertCustomer may fail on duplicate inserts (race condition / retry).
      // Since customerId is already established above, we log and continue.
      console.warn(
        `[AI Credits] upsertCustomer non-fatal error for userId=${userId}:`,
        error,
      );
    }
  }

  return customerId;
}

// =============================================================================
// getCreditPackages — fetch live product data from Polar
// =============================================================================

/** Map of package key → credit amount (not stored in Polar) */
const PACKAGE_CREDITS: Record<string, number> = {
  starter: 50,
  popular: 200,
  pro: 500,
};

/** Order in which packages are displayed */
const PACKAGE_ORDER = ["starter", "popular", "pro"] as const;

/**
 * Fetch AI credit packages from Polar with live pricing.
 * Returns name, price, credits, and badge for each configured package.
 */
export const getCreditPackages = action({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      credits: v.number(),
      priceDisplay: v.string(),
      badge: v.optional(v.string()),
    }),
  ),
  handler: async () => {
    const client = createPolarClient();
    const packages: {
      id: string;
      name: string;
      credits: number;
      priceDisplay: string;
      badge?: string;
    }[] = [];

    for (const key of PACKAGE_ORDER) {
      const productId = PACKAGE_PRODUCT_IDS[key];
      if (!productId) continue;

      const result = await productsGet(client, { id: productId });
      if (!result.ok) {
        console.error(
          `[AI Credits] Failed to fetch product ${key}:`,
          result.error,
        );
        continue;
      }

      const product = result.value;
      // Find the first active price
      const price = product.prices?.[0];
      let priceDisplay = "—";
      if (price && "amountType" in price && price.amountType === "fixed") {
        const amount = (price as { priceAmount: number }).priceAmount;
        const currency =
          (price as { priceCurrency: string }).priceCurrency ?? "usd";
        priceDisplay = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(amount / 100);
      }

      packages.push({
        id: key,
        name: product.name,
        credits: PACKAGE_CREDITS[key] ?? 0,
        priceDisplay,
        ...(key === "popular" ? { badge: "Best Value" } : {}),
      });
    }

    return packages;
  },
});

// =============================================================================
// initiatePurchase — create Polar one-time checkout for AI credits
// =============================================================================

/**
 * Initiate a credit purchase via Polar one-time checkout.
 * Returns the Polar hosted checkout URL to redirect the user to.
 *
 * Required env vars:
 *   POLAR_CREDIT_PRODUCT_STARTER — Polar product ID for the Starter pack (50 credits)
 *   POLAR_CREDIT_PRODUCT_POPULAR — Polar product ID for the Popular pack (200 credits)
 *   POLAR_CREDIT_PRODUCT_PRO     — Polar product ID for the Pro pack (500 credits)
 *   POLAR_ORGANIZATION_TOKEN     — Polar org API token (already used for subscriptions)
 *   POLAR_SERVER                 — "sandbox" or "production"
 *
 * Credits are added to the user's balance via the `order.created` webhook
 * (handled in convex/http.ts via polar component).
 */
export const initiatePurchase = action({
  args: {
    packageId: v.union(
      v.literal("starter"),
      v.literal("popular"),
      v.literal("pro"),
    ),
    successUrl: v.string(),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    // Rate limit per user
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) {
      throw new ConvexError({
        code: ErrorCode.UNAUTHENTICATED,
        message: "Not authenticated",
      });
    }

    await rateLimiter.limit(ctx, "aiCreditPurchase", {
      key: user._id,
      throws: true,
    });

    const productId = PACKAGE_PRODUCT_IDS[args.packageId];
    if (!productId) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: `No Polar product configured for package: ${args.packageId}. Set POLAR_CREDIT_PRODUCT_${args.packageId.toUpperCase()}.`,
      });
    }

    const client = createPolarClient();
    const customerId = await resolveCustomerId(ctx, client);

    const checkout = await checkoutsCreate(client, {
      allowDiscountCodes: true,
      customerId,
      successUrl: args.successUrl,
      products: [productId],
    });

    if (!checkout.ok) {
      console.error("[AI Credits] Checkout creation failed:", checkout.error);
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: `Failed to create checkout: ${JSON.stringify(checkout.error)}`,
      });
    }

    console.log(
      `[AI Credits] Checkout created: package=${args.packageId} user=${user._id} checkoutId=${checkout.value.id}`,
    );

    return { url: checkout.value.url };
  },
});

// =============================================================================
// handleCreditOrderWebhook — called by polar webhook handler on order.created
// =============================================================================

/**
 * Called from the Polar webhook handler when a one-time order for AI credits completes.
 * Adds the purchased credits to the user's balance.
 *
 * The mapping from productId → creditAmount is done here using the same env vars.
 */
export const addCreditsForOrder = action({
  args: {
    userId: v.string(),
    productId: v.string(),
    orderId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Idempotency guard: skip if this order was already credited
    const alreadyProcessed = await ctx.runQuery(
      internal.aiCredits.isOrderProcessed,
      { orderId: args.orderId },
    );
    if (alreadyProcessed) {
      console.log(
        `[AI Credits] Order ${args.orderId} already processed, skipping duplicate.`,
      );
      return null;
    }

    // Determine credit amount from product ID.
    // Webhook may send UUID with or without "prod_" prefix — normalize both.
    const normalizedId = stripPolarPrefix(args.productId);
    const PRODUCT_CREDIT_MAP: Record<string, number> = {
      [stripPolarPrefix(process.env.POLAR_CREDIT_PRODUCT_STARTER ?? "")]: 50,
      [stripPolarPrefix(process.env.POLAR_CREDIT_PRODUCT_POPULAR ?? "")]: 200,
      [stripPolarPrefix(process.env.POLAR_CREDIT_PRODUCT_PRO ?? "")]: 500,
    };

    const creditAmount = PRODUCT_CREDIT_MAP[normalizedId];
    if (!creditAmount) {
      // Not an AI credit product — skip silently
      console.log(
        `[AI Credits] Order ${args.orderId} is not for AI credits (productId=${args.productId}), skipping.`,
      );
      return null;
    }

    await ctx.runMutation(internal.aiCredits.addPurchasedCredits, {
      userId: args.userId,
      poolType: "customer" as const,
      amount: creditAmount,
      referenceId: args.orderId,
      description: `Purchased ${creditAmount} AI credits (order ${args.orderId})`,
    });

    console.log(
      `[AI Credits] Added ${creditAmount} credits for user ${args.userId} (order ${args.orderId})`,
    );

    return null;
  },
});
