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
  "canceled",
  "unpaid",
  "suspended",
  "pending_payment",
]);

type AppSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "suspended"
  | "pending_payment";

/**
 * Map Polar subscription status to our app's status.
 * Unknown statuses default to "active" to avoid breaking the DB.
 */
function mapPolarStatus(
  polarStatus: string,
  canceledAt: unknown,
): AppSubscriptionStatus {
  // If canceledAt is set, always treat as canceled
  if (canceledAt) return "canceled";

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

    await ctx.runMutation(internal.subscriptions.updateFromWebhook, {
      organizationId: member.organizationId,
      subscriptionStatus: "active",
      polarSubscriptionId: data.id,
      polarCustomerId: data.customerId,
      subscriptionPlan: data.product?.name ?? "pro",
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

    const status = mapPolarStatus(data.status, data.canceledAt);

    const currentPeriodEnd = data.currentPeriodEnd
      ? new Date(data.currentPeriodEnd).getTime()
      : undefined;

    await ctx.runMutation(internal.subscriptions.updateFromWebhook, {
      organizationId: settings.organizationId,
      subscriptionStatus: status,
      polarSubscriptionId: data.id,
      subscriptionPlan:
        data.product?.name ?? settings.subscriptionPlan ?? "pro",
      currentPeriodEnd,
    });
  },
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
