"use client";

import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/modules/services/lib/currency";

export function FavoriteServicesTable({
  services,
}: {
  services: Array<{ serviceName: string; count: number; totalSpent: number }>;
}) {
  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Favorite Services</CardTitle>
          <CardDescription>Your most booked services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            No services booked yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Favorite Services</CardTitle>
        <CardDescription>Your most booked services</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service, idx) => (
              <TableRow key={`${service.serviceName}-${idx}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <Sparkles className="size-3.5 text-yellow-500" />
                    )}
                    {service.serviceName}
                  </div>
                </TableCell>
                <TableCell className="text-right">{service.count}</TableCell>
                <TableCell className="text-right">
                  {formatPrice(service.totalSpent)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
