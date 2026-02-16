"use client";

import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PolarPrice {
  priceAmount?: number;
  priceCurrency?: string;
  recurringInterval?: "day" | "week" | "month" | "year" | null;
}

interface PolarProduct {
  id: string;
  name: string;
  description?: string | null;
  prices: PolarPrice[];
  recurringInterval?: "day" | "week" | "month" | "year" | null;
}

function formatPrice(price: PolarPrice): { amount: string; interval: string } {
  const cents = price.priceAmount ?? 0;
  const currency = price.priceCurrency ?? "usd";
  const interval = price.recurringInterval;

  const formatter = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

  const amount = formatter.format(cents / 100);
  const intervalLabel = interval ? `/${interval}` : "";

  return { amount, interval: intervalLabel };
}

function parseFeatures(description: string | null | undefined): string[] {
  if (!description) return [];
  return description
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function PlanCard({
  product,
  badge,
  benefits,
  isCurrent,
  isCanceling,
  subscriptionId,
  organizationId,
  isOwner = false,
}: {
  product: PolarProduct | undefined;
  badge?: string;
  benefits?: string[];
  isCurrent?: boolean;
  isCanceling?: boolean;
  subscriptionId?: string;
  organizationId?: string;
  isOwner?: boolean;
}) {
  const generateCheckoutLink = useAction(api.polarActions.generateCheckoutLink);
  const changeSubscription = useAction(api.polar.changeCurrentSubscription);
  const reactivateSubscription = useMutation(
    api.subscriptions.reactivateSubscription,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!product) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24 mt-2" />
        </CardHeader>
      </Card>
    );
  }

  const activePrice = product.prices.find((p) => p.priceAmount != null);
  const priceInfo = activePrice
    ? formatPrice(activePrice)
    : { amount: "Free", interval: "" };
  const features =
    benefits && benefits.length > 0
      ? benefits
      : parseFeatures(product.description);

  const handleClick = () => {
    if (isCurrent && isCanceling) {
      // Reactivate the same plan (undo cancellation)
      handleReactivate();
    } else if (subscriptionId) {
      // Active subscription — show confirmation before switching plans
      setShowConfirm(true);
    } else {
      // No active subscription — go straight to checkout
      handleNewCheckout();
    }
  };

  const handleReactivate = async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      await reactivateSubscription({
        organizationId: organizationId as Id<"organization">,
      });
      toast.success("Subscription reactivated successfully");
    } catch (error) {
      console.error("Reactivate error:", error);
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to reactivate subscription."
          : "Failed to reactivate subscription. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCheckout = async () => {
    setIsLoading(true);
    try {
      const { url } = await generateCheckoutLink({
        productIds: [product.id],
        origin: window.location.origin,
        successUrl: window.location.href,
      });
      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to start checkout."
          : "Failed to start checkout. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanChange = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    try {
      await changeSubscription({ productId: product.id });
      toast.success(`Plan changed to ${product.name}`);
    } catch (error) {
      console.error("Plan change error:", error);
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to change plan."
          : error instanceof Error
            ? error.message
            : "Failed to change plan. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const canReactivate = isCurrent && isCanceling && isOwner && !!organizationId;

  const buttonLabel = canReactivate
    ? "Reactivate Plan"
    : isCurrent
      ? "Current Plan"
      : !isOwner
        ? "Only owners can manage plans"
        : subscriptionId
          ? `Switch to ${product.name}`
          : `Subscribe to ${product.name}`;

  return (
    <Card className={isCurrent ? "border-primary" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{product.name}</CardTitle>
          {isCurrent && <Badge>Current Plan</Badge>}
          {badge && !isCurrent && <Badge variant="secondary">{badge}</Badge>}
        </div>
        <CardDescription>
          <span className="text-2xl font-bold text-foreground">
            {priceInfo.amount}
          </span>
          <span className="text-muted-foreground">{priceInfo.interval}</span>
        </CardDescription>
      </CardHeader>
      {features.length > 0 && (
        <CardContent>
          <ul className="space-y-2 text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleClick}
          disabled={isLoading || (isCurrent && !canReactivate) || !isOwner}
          variant={
            canReactivate ? "default" : isCurrent ? "outline" : "default"
          }
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {buttonLabel}
        </Button>
      </CardFooter>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to switch to{" "}
              <span className="font-semibold text-foreground">
                {product.name}
              </span>{" "}
              ({priceInfo.amount}
              {priceInfo.interval})? The change will be applied immediately and
              your billing will be prorated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePlanChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
