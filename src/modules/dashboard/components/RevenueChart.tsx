"use client";

import { useQuery } from "convex/react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";

function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return { startDate, endDate: end };
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  appointments: {
    label: "Appointments",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function RevenueChart() {
  const { activeOrganization } = useOrganization();
  const { startDate, endDate } = getDateRange();

  const appointments = useQuery(
    api.appointments.getByDateRange,
    activeOrganization
      ? {
          organizationId: activeOrganization._id,
          startDate,
          endDate,
        }
      : "skip",
  );

  const loading = activeOrganization != null && appointments === undefined;

  // Aggregate by date
  const chartData = (() => {
    if (!appointments) return [];

    const byDate: Record<string, { revenue: number; count: number }> = {};

    // Initialize all days
    const current = new Date(`${startDate}T00:00:00`);
    const last = new Date(`${endDate}T00:00:00`);
    while (current <= last) {
      const ds = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      byDate[ds] = { revenue: 0, count: 0 };
      current.setDate(current.getDate() + 1);
    }

    for (const appt of appointments) {
      if (!byDate[appt.date]) byDate[appt.date] = { revenue: 0, count: 0 };
      byDate[appt.date].count++;
      if (appt.status === "completed") {
        byDate[appt.date].revenue += appt.total;
      }
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        revenue: data.revenue / 100,
        appointments: data.count,
      }));
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Overview</CardTitle>
        <CardDescription>
          Revenue and appointments (last 7 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (name === "revenue")
                        return formatPrice(Number(value) * 100);
                      return String(value);
                    }}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="var(--color-revenue)"
                fillOpacity={0.2}
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
              <Area
                dataKey="appointments"
                type="monotone"
                fill="var(--color-appointments)"
                fillOpacity={0.1}
                stroke="var(--color-appointments)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
