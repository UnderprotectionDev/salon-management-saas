"use client";

import { useQuery } from "convex/react";
import { CreditCard } from "lucide-react";
import { api } from "../../../../convex/_generated/api";

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function PricingBanner() {
  const products = useQuery(api.polar.getConfiguredProducts);

  if (!products) return null;

  const monthlyPrice = products.monthly?.prices.find(
    (p) => p.priceAmount != null,
  );
  const yearlyPrice = products.yearly?.prices.find(
    (p) => p.priceAmount != null,
  );

  if (!monthlyPrice && !yearlyPrice) return null;

  const currency =
    monthlyPrice?.priceCurrency ?? yearlyPrice?.priceCurrency ?? "usd";

  return (
    <div className="mb-8 rounded-xl border border-brand/30 bg-brand/8 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard className="size-4 text-brand" />
        <span className="text-sm font-semibold text-brand">
          Simple, transparent pricing
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {monthlyPrice?.priceAmount != null && (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">
              {formatAmount(monthlyPrice.priceAmount, currency)}
            </span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
        )}
        {yearlyPrice?.priceAmount != null && (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">
              {formatAmount(Math.round(yearlyPrice.priceAmount / 12), currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              /month, billed yearly
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
