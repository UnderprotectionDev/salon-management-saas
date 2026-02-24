"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, Package, PackageX, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { StockFilter } from "./ProductGrid";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  highlight?: boolean;
};

function StatCard({
  title,
  value,
  icon,
  loading,
  onClick,
  highlight,
}: StatCardProps) {
  return (
    <Card
      className={
        onClick
          ? "cursor-pointer transition-colors hover:border-primary"
          : undefined
      }
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={highlight ? "text-amber-500" : "text-muted-foreground"}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div
            className={`text-2xl font-bold ${highlight ? "text-amber-600" : ""}`}
          >
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type InventoryStatsBarProps = {
  organizationId: Id<"organization">;
  onFilterStock?: (filter: StockFilter) => void;
};

export function InventoryStatsBar({
  organizationId,
  onFilterStock,
}: InventoryStatsBarProps) {
  const stats = useQuery(api.products.getInventoryStats, { organizationId });
  const loading = stats === undefined;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Products"
        value={stats?.totalProducts ?? 0}
        icon={<Package className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="Stock Value"
        value={stats ? formatPrice(stats.totalStockValue) : "..."}
        icon={<TrendingUp className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="Low Stock"
        value={stats?.lowStockCount ?? 0}
        icon={<AlertTriangle className="size-4" />}
        loading={loading}
        onClick={
          onFilterStock && stats && stats.lowStockCount > 0
            ? () => onFilterStock("low_stock")
            : undefined
        }
        highlight={!!stats && stats.lowStockCount > 0}
      />
      <StatCard
        title="Out of Stock"
        value={stats?.outOfStockCount ?? 0}
        icon={<PackageX className="size-4" />}
        loading={loading}
        onClick={
          onFilterStock && stats && stats.outOfStockCount > 0
            ? () => onFilterStock("out_of_stock")
            : undefined
        }
        highlight={!!stats && stats.outOfStockCount > 0}
      />
    </div>
  );
}
