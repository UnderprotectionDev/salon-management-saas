"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { subscriptionDetailValidator } from "../../../../convex/lib/validators";
import type { Infer } from "convex/values";

type SubscriptionDetail = Infer<typeof subscriptionDetailValidator>;

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Past Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
  suspended: { label: "Suspended", variant: "destructive" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  pending_payment: { label: "Pending Payment", variant: "destructive" },
};

function formatDate(timestamp: number | undefined) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SubscriptionWidget({
  subscription,
}: {
  subscription: SubscriptionDetail;
}) {
  const statusInfo = STATUS_LABELS[subscription.status] ?? {
    label: subscription.status,
    variant: "outline" as const,
  };

  const daysRemaining = subscription.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (subscription.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {subscription.status === "pending_payment"
                ? "No plan selected"
                : subscription.plan === "free" || !subscription.plan
                  ? "Free Trial"
                  : subscription.plan}
            </CardDescription>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {subscription.status === "trialing" && daysRemaining !== null && (
            <div>
              <dt className="text-muted-foreground">Trial ends</dt>
              <dd className="font-medium">
                {formatDate(subscription.trialEndsAt)} ({daysRemaining} days
                left)
              </dd>
            </div>
          )}
          {subscription.currentPeriodEnd && (
            <div>
              <dt className="text-muted-foreground">Current period ends</dt>
              <dd className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
          )}
          {subscription.cancelledAt && (
            <div>
              <dt className="text-muted-foreground">Cancelled on</dt>
              <dd className="font-medium">
                {formatDate(subscription.cancelledAt)}
              </dd>
            </div>
          )}
          {subscription.gracePeriodEndsAt && (
            <div>
              <dt className="text-destructive">Grace period ends</dt>
              <dd className="font-medium text-destructive">
                {formatDate(subscription.gracePeriodEndsAt)}
              </dd>
            </div>
          )}
          {subscription.suspendedAt && (
            <div>
              <dt className="text-destructive">Suspended on</dt>
              <dd className="font-medium text-destructive">
                {formatDate(subscription.suspendedAt)}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
