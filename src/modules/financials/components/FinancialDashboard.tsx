"use client";

import { useQuery } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";

export function FinancialDashboard({ from, to }: { from: string; to: string }) {
  const { activeOrganization } = useOrganization();

  const stats = useQuery(
    api.financials.getDashboardStats,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  if (!stats) {
    return <Skeleton className="h-12" />;
  }

  const items = [
    { label: "Total Revenue", value: formatPrice(stats.totalRevenue) },
    { label: "Total Expenses", value: formatPrice(stats.totalExpenses) },
    {
      label: "Net P/L",
      value: `${stats.netProfitLoss < 0 ? "-" : ""}${formatPrice(Math.abs(stats.netProfitLoss))}`,
    },
    { label: "Profit Margin", value: `${stats.profitMargin}%` },
    { label: "Daily Average", value: formatPrice(stats.dailyAvgRevenue) },
    { label: "Cash Flow", value: `${stats.cashFlow < 0 ? "-" : ""}${formatPrice(Math.abs(stats.cashFlow))}` },
  ];

  return (
    <div
      className="grid grid-cols-6"
      style={{ border: "1px solid var(--sheet-grid)" }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            borderRight:
              i < items.length - 1 ? "1px solid var(--sheet-grid)" : undefined,
          }}
          className="px-3 py-1.5"
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {item.label}
          </div>
          <div className="text-sm font-bold">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
