"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSubscriptionStatus } from "@/modules/billing/hooks/useSubscriptionStatus";

export function GracePeriodBanner() {
  const { subscription, activeOrganization, isPastDue } =
    useSubscriptionStatus();

  if (!subscription || !isPastDue || !activeOrganization) {
    return null;
  }

  const daysLeft = subscription.gracePeriodEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (subscription.gracePeriodEndsAt - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <AlertTriangle className="size-4" aria-hidden="true" />
      <AlertTitle>Payment Failed</AlertTitle>
      <AlertDescription>
        Your payment could not be processed.
        {daysLeft !== null &&
          ` You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} to update your payment method before your account is suspended.`}{" "}
        <Link
          href={`/${activeOrganization.slug}/billing`}
          className="font-medium underline"
        >
          Update billing
        </Link>
      </AlertDescription>
    </Alert>
  );
}
