"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatPrice } from "@/modules/services/lib/currency";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted))",
];

const chartConfig = {
  revenue: {
    label: "Revenue",
  },
} satisfies ChartConfig;

export function ServicePopularityChart({
  data,
}: {
  data: Array<{
    serviceName: string;
    revenue: number;
  }>;
}) {
  // Limit to top 6 services, group the rest as "Other"
  let chartData = [...data];
  if (chartData.length > 6) {
    const top5 = chartData.slice(0, 5);
    const others = chartData.slice(5);
    const otherRevenue = others.reduce((sum, s) => sum + s.revenue, 0);
    chartData = [...top5, { serviceName: "Other", revenue: otherRevenue }];
  }

  if (chartData.length === 0 || chartData.every((d) => d.revenue === 0)) {
    return (
      <p className="text-sm text-muted-foreground">
        No service revenue data for this period.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatPrice(Number(value))}
              hideLabel
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="revenue"
          nameKey="serviceName"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry) => entry.serviceName}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.serviceName}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
