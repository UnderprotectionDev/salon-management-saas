"use client";

import { useQuery } from "convex/react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

/**
 * Shared hook for subscription status.
 * Prevents duplicate useQuery calls across GracePeriodBanner,
 * SuspendedOverlay, and the billing page.
 */
export function useSubscriptionStatus() {
  const { activeOrganization } = useOrganization();
  const subscription = useQuery(
    api.subscriptions.getSubscriptionStatus,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  return {
    subscription,
    activeOrganization,
    isLoading: subscription === undefined,
    isPendingPayment: subscription?.status === "pending_payment",
    isSuspended: subscription?.status === "suspended",
    isPastDue: subscription?.status === "past_due",
    isActive: subscription?.status === "active",
    isCanceling: subscription?.status === "canceling",
    isCanceled: subscription?.status === "canceled",
  };
}
