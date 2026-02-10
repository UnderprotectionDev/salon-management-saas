"use client";

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

type StaffRow = {
  staffId: Id<"staff">;
  staffName: string;
  appointments: number;
  revenue: number;
};

export function RevenueByStaffTable({ data }: { data: StaffRow[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff data for this period.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Staff Member</TableHead>
          <TableHead className="text-right">Appointments</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.staffId}>
            <TableCell className="font-medium">{row.staffName}</TableCell>
            <TableCell className="text-right">{row.appointments}</TableCell>
            <TableCell className="text-right">{formatPrice(row.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
