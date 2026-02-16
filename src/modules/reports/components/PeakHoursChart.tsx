"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Appointments",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function PeakHoursChart({
  data,
}: {
  data: Array<{ hour: number; count: number }>;
}) {
  const chartData = data.map((d) => ({
    hour: `${String(d.hour).padStart(2, "0")}:00`,
    count: d.count,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No appointment data for this period.
      </p>
    );
  }

  // Find peak hour for highlighting
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="hour"
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
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
