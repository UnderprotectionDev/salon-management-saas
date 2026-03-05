"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, Package, PackageX, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { StockFilter } from "./ProductFilters";

type InventoryStatsBarProps = {
  organizationId: Id<"organization">;
  onFilterStock?: (filter: StockFilter) => void;
};

export function InventoryStatsBar({
  organizationId,
  onFilterStock,
}: InventoryStatsBarProps) {
  const stats = useQuery(api.products.getInventoryStats, { organizationId });

  if (stats === undefined || stats === null) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border bg-card px-4 py-2.5 text-sm">
      {/* Total */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Package className="size-3.5" />
        <span className="font-medium text-foreground">
          {stats.totalProducts}
        </span>
        <span>Products</span>
      </div>

      <span className="text-muted-foreground/40 mx-2">|</span>

      {/* Value */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <TrendingUp className="size-3.5" />
        <span className="font-medium text-foreground tabular-nums">
          {formatPrice(stats.totalStockValue)}
        </span>
        <span>Value</span>
      </div>

      <span className="text-muted-foreground/40 mx-2">|</span>

      {/* Low Stock */}
      <button
        type="button"
        className={`flex items-center gap-1.5 transition-colors ${
          stats.lowStockCount > 0
            ? "text-amber-600 hover:text-amber-700 cursor-pointer"
            : "text-muted-foreground cursor-default"
        }`}
        onClick={() => stats.lowStockCount > 0 && onFilterStock?.("low_stock")}
        disabled={stats.lowStockCount === 0}
        aria-label={`${stats.lowStockCount} low stock item${stats.lowStockCount !== 1 ? "s" : ""}${stats.lowStockCount > 0 ? ", click to filter" : ""}`}
      >
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        <span className="font-medium">{stats.lowStockCount}</span>
        <span>Low</span>
      </button>

      <span className="text-muted-foreground/40 mx-2">|</span>

      {/* Out of Stock */}
      <button
        type="button"
        className={`flex items-center gap-1.5 transition-colors ${
          stats.outOfStockCount > 0
            ? "text-destructive hover:text-destructive/80 cursor-pointer"
            : "text-muted-foreground cursor-default"
        }`}
        onClick={() =>
          stats.outOfStockCount > 0 && onFilterStock?.("out_of_stock")
        }
        disabled={stats.outOfStockCount === 0}
        aria-label={`${stats.outOfStockCount} out of stock item${stats.outOfStockCount !== 1 ? "s" : ""}${stats.outOfStockCount > 0 ? ", click to filter" : ""}`}
      >
        <PackageX className="size-3.5" aria-hidden="true" />
        <span className="font-medium">{stats.outOfStockCount}</span>
        <span>Out</span>
      </button>
    </div>
  );
}
