"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import {
  CustomerPortalButton,
  PlanCard,
  SubscriptionWidget,
} from "@/modules/billing";
import { useAction, useQuery } from "convex/react";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";

export default function BillingPage() {
  const { activeOrganization, currentRole } = useOrganization();
  const subscription = useQuery(
    api.subscriptions.getSubscriptionStatus,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );
  const products = useQuery(api.polar.getConfiguredProducts);
  const benefitsList = useQuery(api.polarSync.getProductBenefits);
  const triggerSync = useAction(api.polarSync.triggerSync);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!subscription || !activeOrganization || products === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Manage your salon subscription
          </p>
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasProducts = products?.monthly || products?.yearly;
  const benefitsMap: Record<string, string[]> = {};
  if (benefitsList) {
    for (const item of benefitsList) {
      benefitsMap[item.polarProductId] = item.benefits;
    }
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      toast.success("Products synced successfully");
    } catch (error) {
      console.error("Failed to sync products:", error);
      toast.error("Failed to sync products. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const isOwner = currentRole === "owner";
  const isActive =
    subscription.status === "active" || subscription.status === "past_due";
  const currentPlan = subscription.plan;
  const polarSubId = subscription.polarSubscriptionId ?? undefined;

  // Plan detection: compare product name with subscription plan name
  const isMonthly = isActive && products?.monthly?.name === currentPlan;
  const isYearly = isActive && products?.yearly?.name === currentPlan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your salon subscription</p>
      </div>

      <SubscriptionWidget subscription={subscription} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {isActive ? "Your Plan" : "Choose a Plan"}
        </h2>
        {!hasProducts ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              Products not synced yet. Click below to fetch plans from Polar.
            </p>
            <Button onClick={handleSync} disabled={isSyncing} variant="outline">
              {isSyncing ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 mr-2" />
                  Sync Products
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {products?.monthly && (
              <PlanCard
                product={products.monthly}
                benefits={benefitsMap[products.monthly.id]}
                isCurrent={isMonthly}
                subscriptionId={isActive ? polarSubId : undefined}
              />
            )}
            {products?.yearly && (
              <PlanCard
                product={products.yearly}
                badge={isYearly ? undefined : "Save 17%"}
                benefits={benefitsMap[products.yearly.id]}
                isCurrent={isYearly}
                subscriptionId={isActive ? polarSubId : undefined}
              />
            )}
          </div>
        )}
      </div>

      {isOwner && isActive && (
        <div className="flex gap-4">
          <CustomerPortalButton />
        </div>
      )}

      {(subscription.status === "suspended" ||
        subscription.status === "pending_payment") && (
        <div className="rounded-lg border border-destructive bg-destructive/5 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-destructive">
            {subscription.status === "pending_payment"
              ? "Subscription Required"
              : "Account Suspended"}
          </h3>
          <p className="text-muted-foreground">
            {subscription.status === "pending_payment"
              ? "Please choose a plan above to activate your salon."
              : "Your subscription has been suspended. Choose a plan above to reactivate your salon."}
          </p>
        </div>
      )}
    </div>
  );
}
