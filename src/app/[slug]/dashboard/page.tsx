"use client";

import { useQuery } from "convex/react";
import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  loading?: boolean;
};

function StatCard({ title, value, description, icon, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { activeOrganization } = useOrganization();

  const staffList = useQuery(
    api.staff.listActive,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const settings = useQuery(
    api.organizations.getSettings,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const isLoading = staffList === undefined || settings === undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {activeOrganization?.name ?? "your salon"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Staff"
          value={staffList?.length ?? 0}
          description="Team members"
          icon={<Users className="size-4" />}
          loading={isLoading}
        />
        <StatCard
          title="Today's Appointments"
          value={0}
          description="Coming soon"
          icon={<Calendar className="size-4" />}
          loading={false}
        />
        <StatCard
          title="This Week"
          value={0}
          description="Total bookings"
          icon={<TrendingUp className="size-4" />}
          loading={false}
        />
        <StatCard
          title="Avg. Duration"
          value="--"
          description="Per appointment"
          icon={<Clock className="size-4" />}
          loading={false}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your salon</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Appointment booking coming soon
            </div>
          </CardContent>
        </Card>

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
                {isLoading ? "Loading..." : "No business hours configured"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
