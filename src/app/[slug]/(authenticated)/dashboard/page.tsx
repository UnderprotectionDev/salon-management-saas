"use client";

import { useQuery } from "convex/react";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DashboardStats,
  QuickActions,
  RevenueChart,
  SetupChecklist,
  TodaysAppointments,
  WelcomeModal,
} from "@/modules/dashboard";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../convex/_generated/api";

export default function DashboardPage() {
  const { activeOrganization } = useOrganization();

  const settings = useQuery(
    api.organizations.getSettings,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {activeOrganization?.name ?? "your salon"}
        </p>
      </div>

      <SetupChecklist />

      <DashboardStats />

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart />
        <TodaysAppointments />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QuickActions />

        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>Your salon&apos;s operating hours</CardDescription>
          </CardHeader>
          <CardContent>
            {settings?.businessHours ? (
              <div className="space-y-2 text-sm">
                {Object.entries(settings.businessHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize text-muted-foreground">
                      {day}
                    </span>
                    <span>
                      {!hours
                        ? "Not set"
                        : hours.closed
                          ? "Closed"
                          : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {settings === undefined
                  ? "Loading..."
                  : "No business hours configured"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {activeOrganization && (
        <Suspense>
          <WelcomeModal slug={activeOrganization.slug} />
        </Suspense>
      )}
    </div>
  );
}
