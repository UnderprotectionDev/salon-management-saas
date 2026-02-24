"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { StockFilter } from "./ProductGrid";

type LowStockBannerProps = {
  organizationId: Id<"organization">;
  onViewLowStock?: (filter: StockFilter) => void;
};

export function LowStockBanner({
  organizationId,
  onViewLowStock,
}: LowStockBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const stats = useQuery(api.products.getInventoryStats, { organizationId });

  const totalAlerts =
    (stats?.lowStockCount ?? 0) + (stats?.outOfStockCount ?? 0);

  if (dismissed || !stats || totalAlerts === 0) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="size-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">
          <strong>{totalAlerts}</strong>{" "}
          {totalAlerts === 1 ? "product is" : "products are"} running low or out
          of stock.{" "}
          {onViewLowStock && (
            <button
              type="button"
              onClick={() => onViewLowStock("low_stock")}
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              View Low Stock Items
            </button>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-amber-600 hover:text-amber-800"
          onClick={() => setDismissed(true)}
        >
          <X className="size-3.5" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
