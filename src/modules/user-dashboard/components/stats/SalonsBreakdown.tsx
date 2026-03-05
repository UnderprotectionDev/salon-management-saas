"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";

export function SalonsBreakdown({
  salons,
}: {
  salons: Array<{
    organizationId: string;
    name: string;
    slug: string;
    totalVisits: number;
    totalSpent: number;
  }>;
}) {
  if (salons.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Salons</CardTitle>
        <CardDescription>
          Breakdown by salon ({salons.length} salon
          {salons.length !== 1 ? "s" : ""})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {salons.map((salon) => (
            <Link
              key={salon.organizationId}
              href={`/${salon.slug}/book`}
              className="block"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="size-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{salon.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {salon.totalVisits} visit
                      {salon.totalVisits !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">
                    {formatPrice(salon.totalSpent)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    total spent
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
