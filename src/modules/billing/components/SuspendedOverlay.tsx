"use client";

import { Button } from "@/components/ui/button";
import { useOrganization } from "@/modules/organization";
import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "../../../../convex/_generated/api";

export function SuspendedOverlay() {
  const { activeOrganization } = useOrganization();
  const pathname = usePathname();
  const subscription = useQuery(
    api.subscriptions.getSubscriptionStatus,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  // Don't block the billing page itself
  const billingPath = activeOrganization
    ? `/${activeOrganization.slug}/billing`
    : "/billing";
  const isBillingPage = pathname === billingPath;
  const isPendingPayment = subscription?.status === "pending_payment";
  const isSuspended = subscription?.status === "suspended";

  if (isBillingPage || !subscription || (!isSuspended && !isPendingPayment)) {
    return null;
  }

  if (!activeOrganization) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 size-16 text-destructive" />
        <h2 className="mb-2 text-2xl font-bold">
          {isPendingPayment ? "Subscription Required" : "Account Suspended"}
        </h2>
        <p className="mb-6 text-muted-foreground">
          {isPendingPayment
            ? "Please complete your subscription to get started."
            : "Your salon's subscription has been suspended. Please update your billing information to restore access."}
        </p>
        <Button asChild>
          <Link href={`/${activeOrganization.slug}/billing`}>
            Go to Billing
          </Link>
        </Button>
      </div>
    </div>
  );
}
