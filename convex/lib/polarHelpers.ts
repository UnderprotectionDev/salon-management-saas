"use node";

import { PolarCore } from "@polar-sh/sdk/core.js";
import { customersCreate } from "@polar-sh/sdk/funcs/customersCreate.js";
import { customersGet } from "@polar-sh/sdk/funcs/customersGet.js";
import { customersList } from "@polar-sh/sdk/funcs/customersList.js";
import { ConvexError } from "convex/values";
import { api, components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { polar } from "../polar";
import { ErrorCode } from "./functions";

/**
 * Create a PolarCore client using environment variables.
 * Throws ConvexError if POLAR_ORGANIZATION_TOKEN is not set.
 */
export function createPolarClient(): PolarCore {
  const accessToken = process.env.POLAR_ORGANIZATION_TOKEN;
  if (!accessToken) {
    throw new ConvexError({
      code: ErrorCode.INTERNAL_ERROR,
      message: "POLAR_ORGANIZATION_TOKEN is not set",
    });
  }
  const serverEnv = process.env.POLAR_SERVER;
  const server: "sandbox" | "production" =
    serverEnv === "sandbox" ? "sandbox" : "production";
  return new PolarCore({ accessToken, server });
}

/**
 * Resolve a Polar customer ID for the current user.
 * Creates the customer in Polar if not found, and persists the mapping to DB.
 */
export async function resolveCustomerId(
  ctx: ActionCtx,
  client: PolarCore,
): Promise<string> {
  const user = await ctx.runQuery(api.users.getCurrentUser);
  if (!user) {
    throw new ConvexError({
      code: ErrorCode.UNAUTHENTICATED,
      message: "User not authenticated",
    });
  }

  const userId = user._id as string;
  if (!user.email) {
    throw new ConvexError({
      code: ErrorCode.VALIDATION_ERROR,
      message: "User email is required",
    });
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
        const sorted = [...listResult.value.result.items].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
        customerId = sorted[0].id;
      } else {
        throw new ConvexError({
          code: ErrorCode.INTERNAL_ERROR,
          message: `Failed to create Polar customer and no existing customer found: ${JSON.stringify(createResult.error)}`,
        });
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
