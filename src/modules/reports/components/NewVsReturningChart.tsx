"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  newCustomers: {
    label: "New",
    color: "hsl(var(--chart-1))",
  },
  returningCustomers: {
    label: "Returning",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function NewVsReturningChart({
  data,
}: {
  data: Array<{
    month: string;
    newCustomers: number;
    returningCustomers: number;
  }>;
}) {
  const chartData = data.map((d) => ({
    ...d,
    month: new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }),
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No completed appointments in this period.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="newCustomers"
          fill="var(--color-newCustomers)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="returningCustomers"
          fill="var(--color-returningCustomers)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
