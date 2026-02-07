"use client";

import { CalendarDays, DollarSign, Eye, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/modules/services/lib/currency";

type CustomerStatsProps = {
  totalVisits: number;
  totalSpent: number;
  noShowCount: number;
  createdAt: number;
};

export function CustomerStats({
  totalVisits,
  totalSpent,
  noShowCount,
  createdAt,
}: CustomerStatsProps) {
  const memberSince = new Date(createdAt).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
  });

  const stats = [
    {
      label: "Total Visits",
      value: totalVisits.toString(),
      icon: Eye,
    },
    {
      label: "Total Spent",
      value: formatPrice(totalSpent),
      icon: DollarSign,
    },
    {
      label: "No-Shows",
      value: noShowCount.toString(),
      icon: XCircle,
    },
    {
      label: "Member Since",
      value: memberSince,
      icon: CalendarDays,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <stat.icon className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
