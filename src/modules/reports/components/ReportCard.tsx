"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportCard({
  title,
  value,
  change,
  suffix,
}: {
  title: string;
  value: string;
  change?: number;
  suffix?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {change !== undefined && change !== 0 && (
          <span
            className={`flex items-center gap-1 text-xs ${
              change > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change > 0 ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
