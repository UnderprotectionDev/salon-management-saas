"use node";

import { Buffer as BufferPolyfill } from "node:buffer";
globalThis.Buffer = BufferPolyfill;

import { PolarCore } from "@polar-sh/sdk/core.js";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { customerSessionsCreate } from "@polar-sh/sdk/funcs/customerSessionsCreate.js";
import { customersCreate } from "@polar-sh/sdk/funcs/customersCreate.js";
import { customersGet } from "@polar-sh/sdk/funcs/customersGet.js";
import { customersList } from "@polar-sh/sdk/funcs/customersList.js";
import { subscriptionsRevoke } from "@polar-sh/sdk/funcs/subscriptionsRevoke.js";
import { v } from "convex/values";
import { api, components } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { polar } from "./polar";

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

  // Look up existing Polar customer in DB
  const dbCustomer = await polar.getCustomerByUserId(ctx, userId);
  let customerId = dbCustomer?.id;

  // Verify customer still exists in Polar (may have been deleted after cancel)
  if (customerId) {
    const verifyResult = await customersGet(client, { id: customerId });
    if (!verifyResult.ok) {
      console.warn(
        "Polar customer in DB is no longer valid, will recreate:",
        customerId,
      );
      customerId = undefined;
    }
  }

  if (!customerId) {
    // Try to create customer in Polar
    const createResult = await customersCreate(client, {
      email,
      metadata: { userId },
    });

    if (createResult.ok) {
      customerId = createResult.value.id;
    } else {
      // Creation failed — email probably already exists. Look up existing.
      console.error(
        "Polar customer creation failed, searching for existing:",
        createResult.error,
      );
      const listResult = await customersList(client, { email });
      if (listResult.ok && listResult.value.result.items.length > 0) {
        // Sort by id (deterministic) to avoid non-deterministic selection
        const sorted = [...listResult.value.result.items].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
        customerId = sorted[0].id;
      } else {
        throw new Error(
          `Failed to create Polar customer and no existing customer found: ${JSON.stringify(createResult.error)}`,
        );
      }
    }

    // Save to DB — ignore if already exists
    try {
      await ctx.runMutation(components.polar.lib.upsertCustomer, {
        id: customerId,
        userId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists") || message.includes("duplicate")) {
        // Customer already registered in DB — continue
      } else {
        console.error("Failed to upsert Polar customer:", error);
        throw error;
      }
    }
  }

  return customerId;
}

// Custom generateCheckoutLink action — fixes "Customer not created" error.
// If customer creation fails, looks up existing customer by email.
export const generateCheckoutLink = action({
  args: {
    productIds: v.array(v.string()),
    origin: v.string(),
    successUrl: v.string(),
    subscriptionId: v.optional(v.string()),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    const client = createPolarClient();
    const customerId = await resolveCustomerId(ctx, client);

    const checkout = await checkoutsCreate(client, {
      allowDiscountCodes: true,
      customerId,
      subscriptionId: args.subscriptionId,
      embedOrigin: args.origin,
      successUrl: args.successUrl,
      products: args.productIds,
    });

    if (!checkout.ok) {
      console.error("Checkout creation failed:", checkout.error);
      throw new Error(
        `Failed to create checkout: ${JSON.stringify(checkout.error)}`,
      );
    }

    return { url: checkout.value.url };
  },
});

// Custom generateCustomerPortalUrl action — the library's action
// throws if customer is not found in DB. This version creates the customer.
export const generateCustomerPortalUrl = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    const client = createPolarClient();
    const customerId = await resolveCustomerId(ctx, client);

    const session = await customerSessionsCreate(client, { customerId });

    if (!session.ok) {
      console.error("Customer session creation failed:", session.error);
      throw new Error(
        `Failed to create customer portal session: ${JSON.stringify(session.error)}`,
      );
    }

    return { url: session.value.customerPortalUrl };
  },
});

/**
 * Internal action to cancel a subscription in Polar.
 * Called from cancelSubscription mutation via scheduler.
 */
export const cancelInPolar = internalAction({
  args: { polarSubscriptionId: v.string() },
  handler: async (_ctx, args) => {
    const client = createPolarClient();
    const result = await subscriptionsRevoke(client, {
      id: args.polarSubscriptionId,
    });

    if (!result.ok) {
      console.error(
        "Failed to cancel subscription in Polar:",
        args.polarSubscriptionId,
        result.error,
      );
      throw new Error(
        `Failed to cancel subscription in Polar: ${JSON.stringify(result.error)}`,
      );
    }
  },
});
