"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/modules/services/lib/currency";

type StaffEntry = {
  staffId: Id<"staff">;
  staffName: string;
  totalAppointments: number;
  completed: number;
  noShows: number;
  cancelled: number;
  revenue: number;
  utilization: number;
};

type SortKey =
  | "staffName"
  | "totalAppointments"
  | "revenue"
  | "utilization"
  | "noShows";

export function StaffPerformanceTable({ data }: { data: StaffEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No staff data for this period.
      </p>
    );
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("staffName")}
          >
            Name{sortIndicator("staffName")}
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("totalAppointments")}
          >
            Appointments{sortIndicator("totalAppointments")}
          </TableHead>
          <TableHead className="text-right">Completed</TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("noShows")}
          >
            No-shows{sortIndicator("noShows")}
          </TableHead>
          <TableHead className="text-right">Cancelled</TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("revenue")}
          >
            Revenue{sortIndicator("revenue")}
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("utilization")}
          >
            Utilization{sortIndicator("utilization")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => {
          const noShowRate =
            row.totalAppointments > 0
              ? (row.noShows / row.totalAppointments) * 100
              : 0;
          return (
            <TableRow key={row.staffId}>
              <TableCell className="font-medium">{row.staffName}</TableCell>
              <TableCell className="text-right">
                {row.totalAppointments}
              </TableCell>
              <TableCell className="text-right">{row.completed}</TableCell>
              <TableCell
                className={`text-right ${noShowRate > 10 ? "text-destructive font-medium" : ""}`}
              >
                {row.noShows}
                {noShowRate > 10 && (
                  <span className="ml-1 text-xs">
                    ({Math.round(noShowRate)}%)
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">{row.cancelled}</TableCell>
              <TableCell className="text-right">
                {formatPrice(row.revenue)}
              </TableCell>
              <TableCell className="text-right">{row.utilization}%</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
