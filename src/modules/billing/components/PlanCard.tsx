"use client";

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
import { useAction } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

  const formatter = new Intl.NumberFormat("en-US", {
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
  subscriptionId,
}: {
  product: PolarProduct | undefined;
  badge?: string;
  benefits?: string[];
  isCurrent?: boolean;
  subscriptionId?: string;
}) {
  const generateCheckoutLink = useAction(api.polarActions.generateCheckoutLink);
  const generatePortalUrl = useAction(
    api.polarActions.generateCustomerPortalUrl,
  );
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      if (subscriptionId) {
        // Active paid subscription — plan changes go through customer portal
        const result = await generatePortalUrl();
        window.location.href = result.url;
      } else {
        // No active subscription — create a new checkout
        const { url } = await generateCheckoutLink({
          productIds: [product.id],
          origin: window.location.origin,
          successUrl: window.location.href,
        });
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout/portal error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = isCurrent
    ? "Current Plan"
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
            {features.map((feature, index) => (
              <li
                key={`${feature}-${index}`}
                className="flex items-center gap-2"
              >
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
          onClick={handleSubscribe}
          disabled={isLoading || isCurrent}
          variant={isCurrent ? "outline" : "default"}
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
