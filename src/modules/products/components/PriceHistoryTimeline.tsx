"use client";

import { useQuery } from "convex/react";
import { ArrowDown, ArrowUp, History, Minus } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { PriceHistorySkeleton } from "./skeletons/PriceHistorySkeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type PriceHistoryTimelineProps = {
  productId: Id<"products">;
  organizationId: Id<"organization">;
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function PriceHistoryTimeline({
  productId,
  organizationId,
}: PriceHistoryTimelineProps) {
  const history = useQuery(api.priceHistory.listByProduct, {
    organizationId,
    productId,
    limit: 10,
  });

  if (history === undefined) {
    return <PriceHistorySkeleton />;
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="rounded-full bg-muted p-3 mb-2">
          <History className="size-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">No price changes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, index) => {
        const isIncrease = entry.newValue > entry.previousValue;
        const isDecrease = entry.newValue < entry.previousValue;
        const isLast = index === history.length - 1;
        const fieldLabel = entry.field === "sellingPrice" ? "Selling" : "Cost";

        return (
          <div
            key={entry._id}
            className={`flex items-center gap-3 py-2.5 ${!isLast ? "border-b border-border/50" : ""}`}
          >
            {/* Direction icon */}
            <div
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                isIncrease
                  ? "bg-emerald-500/10 text-emerald-600"
                  : isDecrease
                    ? "bg-red-500/10 text-destructive"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isIncrease ? (
                <ArrowUp className="size-3" aria-hidden="true" />
              ) : isDecrease ? (
                <ArrowDown className="size-3" aria-hidden="true" />
              ) : (
                <Minus className="size-3" aria-hidden="true" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium">{fieldLabel}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatPrice(entry.previousValue)}
                </span>
                <span
                  className="text-xs text-muted-foreground"
                  aria-hidden="true"
                >
                  →
                </span>
                <span className="text-xs font-medium tabular-nums">
                  {formatPrice(entry.newValue)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(entry.createdAt)}
                {entry.staffName && ` · ${entry.staffName}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
