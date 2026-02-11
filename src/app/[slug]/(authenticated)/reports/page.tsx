"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import {
  RevenueReport,
  StaffPerformanceReport,
  CustomerReport,
} from "@/modules/reports";

export default function ReportsPage() {
  const { currentRole } = useOrganization();
  const isStaff = currentRole === "staff";

  if (!currentRole) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          {isStaff
            ? "View your performance and customer trends."
            : "Analyze revenue, staff performance, and customer trends."}
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Tabs
          defaultValue={isStaff ? "staff" : "revenue"}
          className="space-y-6"
        >
          <TabsList>
            {!isStaff && <TabsTrigger value="revenue">Revenue</TabsTrigger>}
            <TabsTrigger value="staff">
              {isStaff ? "My Performance" : "Staff Performance"}
            </TabsTrigger>
            <TabsTrigger value="customers">
              {isStaff ? "My Customers" : "Customers"}
            </TabsTrigger>
          </TabsList>

          {!isStaff && (
            <TabsContent value="revenue">
              <RevenueReport />
            </TabsContent>
          )}
          <TabsContent value="staff">
            <StaffPerformanceReport />
          </TabsContent>
          <TabsContent value="customers">
            <CustomerReport />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
