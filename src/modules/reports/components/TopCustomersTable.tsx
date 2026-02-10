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

type CustomerRow = {
  customerId: Id<"customers">;
  name: string;
  phone: string;
  appointments: number;
  revenue: number;
  lastVisitDate: string | null;
};

export function TopCustomersTable({ data }: { data: CustomerRow[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No customer data for this period.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead className="text-right">Appointments</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Last Visit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.customerId}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>{row.phone}</TableCell>
            <TableCell className="text-right">{row.appointments}</TableCell>
            <TableCell className="text-right">{formatPrice(row.revenue)}</TableCell>
            <TableCell className="text-right">
              {row.lastVisitDate
                ? new Date(`${row.lastVisitDate}T00:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
