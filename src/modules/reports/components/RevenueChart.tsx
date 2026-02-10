"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatPrice } from "@/modules/services/lib/currency";

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

export function RevenueChart({
  data,
}: {
  data: Array<{ date: string; revenue: number; appointments: number; completed: number }>;
}) {
  const chartData = data.map((d) => ({
    date: new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: d.revenue / 100,
    appointments: d.appointments,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
          yAxisId="revenue"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          orientation="left"
        />
        <YAxis
          yAxisId="appointments"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          orientation="right"
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                if (name === "revenue") return formatPrice(Number(value) * 100);
                return String(value);
              }}
            />
          }
        />
        <Area
          yAxisId="revenue"
          dataKey="revenue"
          type="monotone"
          fill="var(--color-revenue)"
          fillOpacity={0.2}
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
        <Area
          yAxisId="appointments"
          dataKey="appointments"
          type="monotone"
          fill="var(--color-appointments)"
          fillOpacity={0.1}
          stroke="var(--color-appointments)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
