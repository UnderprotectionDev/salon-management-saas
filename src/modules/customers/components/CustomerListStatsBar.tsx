"use client";

import { useQuery } from "convex/react";
import { Activity, DollarSign, UserPlus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type CustomerListStatsBarProps = {
  organizationId: Id<"organization">;
};

export function CustomerListStatsBar({
  organizationId,
}: CustomerListStatsBarProps) {
  const stats = useQuery(api.customers.getListStats, { organizationId });

  if (stats == null) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border bg-card px-4 py-2.5 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="size-3.5" />
        <span className="font-medium text-foreground">
          {stats.totalCustomers}
        </span>
        <span>Total</span>
      </div>

      <span className="text-muted-foreground/40 mx-2" aria-hidden="true">
        |
      </span>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <UserPlus className="size-3.5" />
        <span className="font-medium text-foreground">
          {stats.newThisMonth}
        </span>
        <span>New This Month</span>
      </div>

      <span className="text-muted-foreground/40 mx-2" aria-hidden="true">
        |
      </span>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Activity className="size-3.5" />
        <span className="font-medium text-foreground">
          {stats.activeCustomers}
        </span>
        <span>Active (90d)</span>
      </div>

      <span className="text-muted-foreground/40 mx-2" aria-hidden="true">
        |
      </span>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <DollarSign className="size-3.5" />
        <span className="font-medium text-foreground tabular-nums">
          {formatPrice(stats.averageSpend)}
        </span>
        <span>Avg. Spend</span>
      </div>
    </div>
  );
}
