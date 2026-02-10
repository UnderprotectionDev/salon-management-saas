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

  if (!currentRole) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (currentRole === "member") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Admin access required</h2>
          <p className="text-muted-foreground">
            You need admin or owner permissions to view reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Analyze revenue, staff performance, and customer trends.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <RevenueReport />
          </TabsContent>
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
