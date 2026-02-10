"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/modules/services/lib/currency";

type ServiceRow = {
  serviceName: string;
  appointments: number;
  revenue: number;
};

export function RevenueByServiceTable({ data }: { data: ServiceRow[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No service data for this period.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead className="text-right">Appointments</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.serviceName}>
            <TableCell className="font-medium">{row.serviceName}</TableCell>
            <TableCell className="text-right">{row.appointments}</TableCell>
            <TableCell className="text-right">{formatPrice(row.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
