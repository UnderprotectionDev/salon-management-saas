"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  utilization: {
    label: "Utilization %",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function getUtilizationColor(utilization: number): string {
  if (utilization < 50) return "hsl(var(--chart-amber))";
  if (utilization <= 80) return "hsl(var(--chart-2))";
  return "hsl(var(--chart-blue))";
}

export function StaffUtilizationChart({
  data,
}: {
  data: Array<{ staffName: string; utilization: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No staff data for this period.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    fill: getUtilizationColor(d.utilization),
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="staffName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          width={100}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(value) => `${value}%`} hideLabel />
          }
        />
        <Bar dataKey="utilization" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
