import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks.js";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { rateLimiter } from "./lib/rateLimits";
import { polar } from "./polar";

/** Valid subscription statuses in our app */
const VALID_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "canceling",
  "canceled",
  "unpaid",
  "suspended",
  "pending_payment",
]);

type AppSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceling"
  | "canceled"
  | "unpaid"
  | "suspended"
  | "pending_payment";

/**
 * Map Polar subscription status to our app's status.
 *
 * Key distinction:
 * - "canceling" = canceledAt is set but endedAt is null (subscription still active until period end)
 * - "canceled"  = endedAt is set (subscription has actually ended)
 *
 * Unknown statuses default to "active" to avoid breaking the DB.
 */
function mapPolarStatus(
  polarStatus: string,
  canceledAt: unknown,
  endedAt: unknown,
): AppSubscriptionStatus {
  // If subscription has actually ended, it's truly canceled
  if (endedAt) return "canceled";

  // If cancellation requested but not yet ended, it's in "canceling" state
  // (still active on Polar, user can switch plans)
  if (canceledAt) return "canceling";

  // Map known Polar statuses to our statuses
  if (VALID_STATUSES.has(polarStatus)) {
    return polarStatus as AppSubscriptionStatus;
  }

  // Unknown Polar statuses — log and default to active
  console.warn(
    `Unknown Polar subscription status: "${polarStatus}", defaulting to "active"`,
  );
  return "active";
}

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

polar.registerRoutes(http, {
  onSubscriptionCreated: async (ctx, event) => {
    const data = event.data;
    const metadata = data.customer?.metadata as
      | Record<string, string>
      | undefined;
    const userId = metadata?.userId;

    if (!userId) {
      console.error("Polar webhook: no userId in customer metadata");
      return;
    }

    // Find org by user membership (owner)
    const member = await ctx.runQuery(
      internal.subscriptions_helpers.findOwnerMember,
      {
        userId,
      },
    );

    if (!member) {
      console.error("Polar webhook: no org found for userId", userId);
      return;
    }

    const currentPeriodEnd = data.currentPeriodEnd
      ? new Date(data.currentPeriodEnd).getTime()
      : undefined;

    const status = mapPolarStatus(data.status, data.canceledAt, data.endedAt);

    await ctx.runMutation(internal.subscriptions.updateFromWebhook, {
      organizationId: member.organizationId,
      subscriptionStatus: status,
      polarSubscriptionId: data.id,
      polarCustomerId: data.customerId,
      subscriptionPlan: data.product?.name ?? "unknown",
      currentPeriodEnd,
    });
  },
  onSubscriptionUpdated: async (ctx, event) => {
    const data = event.data;

    // Find org by polarSubscriptionId
    const settings = await ctx.runQuery(
      internal.subscriptions_helpers.findByPolarSubscriptionId,
      { polarSubscriptionId: data.id },
    );

    if (!settings) {
      console.error("Polar webhook: no org found for subscription", data.id);
      return;
    }

    const status = mapPolarStatus(data.status, data.canceledAt, data.endedAt);

    const currentPeriodEnd = data.currentPeriodEnd
      ? new Date(data.currentPeriodEnd).getTime()
      : undefined;

    await ctx.runMutation(internal.subscriptions.updateFromWebhook, {
      organizationId: settings.organizationId,
      subscriptionStatus: status,
      polarSubscriptionId: data.id,
      subscriptionPlan:
        data.product?.name ?? settings.subscriptionPlan ?? "unknown",
      currentPeriodEnd,
    });
  },
});

// =============================================================================
// Polar: Order Webhook (AI Credit Purchases)
// =============================================================================
//
// The @convex-dev/polar component handles subscription events but NOT order events.
// This custom HTTP action handles order.paid → credit top-up.
//
// Polar Dashboard → Webhooks → Add endpoint:
//   URL:    https://<your-convex-url>/polar/order-webhook
//   Events: order.paid
//   Secret: <copy and set as POLAR_WEBHOOK_ORDER_SECRET env var>
//
// Note: The existing polar.registerRoutes handles subscription events at /polar/events.
// Use a different secret for this endpoint (POLAR_WEBHOOK_ORDER_SECRET).
//
http.route({
  path: "/polar/order-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.POLAR_WEBHOOK_ORDER_SECRET;
    if (!webhookSecret) {
      console.error("[Order Webhook] POLAR_WEBHOOK_ORDER_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    let event: ReturnType<typeof validateEvent>;
    try {
      event = validateEvent(body, headers, webhookSecret);
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        console.error("[Order Webhook] Invalid signature:", err.message);
        return new Response("Invalid signature", { status: 403 });
      }
      console.error("[Order Webhook] Unexpected error:", err);
      return new Response("Webhook error", { status: 400 });
    }

    // Only handle order.paid (not order.created — that fires before payment)
    if (event.type !== "order.paid") {
      return new Response("OK (ignored)", { status: 200 });
    }

    // event.data is an Order object
    // productId: order.data.productId (string | null)
    // userId: stored in customer.metadata.userId when we created the Polar customer
    const order = event.data;
    const userId = (
      order.customer?.metadata as Record<string, string> | undefined
    )?.userId;

    if (!userId) {
      console.error(
        "[Order Webhook] No userId in customer metadata — cannot add credits",
      );
      return new Response("OK (no userId)", { status: 200 });
    }

    const productId = order.productId;
    if (!productId) {
      console.error("[Order Webhook] No productId in order event");
      return new Response("OK (no productId)", { status: 200 });
    }

    // Schedule credit addition (async, non-blocking)
    await ctx.runAction(internal.aiCreditActions.addCreditsForOrder, {
      userId,
      productId,
      orderId: order.id,
    });

    return new Response("OK", { status: 200 });
  }),
});

// =============================================================================
// Appointment: Confirmation Code Lookup (rate-limited)
// =============================================================================

http.route({
  path: "/api/appointments/by-confirmation",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const orgId = url.searchParams.get("orgId");

    if (!code || !orgId) {
      return new Response(
        JSON.stringify({ error: "Missing code or orgId parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Validate confirmation code format (6 chars, alphanumeric excluding 0/O/I/1)
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limit by org + code combo to prevent brute-force enumeration
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "confirmationCodeLookup",
      { key: `${orgId}:${code}` },
    );
    if (!ok) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((retryAfter ?? 60000) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((retryAfter ?? 60000) / 1000)),
          },
        },
      );
    }

    const result = await ctx.runQuery(
      internal.appointments._getByConfirmationCode,
      {
        organizationId: orgId as never,
        confirmationCode: code,
      },
    );

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }),
});

export default http;
