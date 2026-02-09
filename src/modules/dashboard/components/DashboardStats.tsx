"use client";

import { useQuery } from "convex/react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Footprints,
  TrendingDown,
  TrendingUp,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type StatCardProps = {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
};

function StatCard({ title, value, change, icon, loading }: StatCardProps) {
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
            {change !== undefined && change !== 0 && (
              <p className="flex items-center gap-1 text-xs">
                {change > 0 ? (
                  <TrendingUp className="size-3 text-green-600" />
                ) : (
                  <TrendingDown className="size-3 text-red-600" />
                )}
                <span
                  className={change > 0 ? "text-green-600" : "text-red-600"}
                >
                  {change > 0 ? "+" : ""}
                  {change}% vs last week
                </span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const { activeOrganization } = useOrganization();
  const today = getToday();

  const stats = useQuery(
    api.analytics.getDashboardStats,
    activeOrganization
      ? { organizationId: activeOrganization._id, date: today }
      : "skip",
  );

  const loading = stats === undefined;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Today's Appointments"
        value={stats?.todayTotal ?? 0}
        change={stats?.todayTotalChange}
        icon={<Calendar className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="Completed"
        value={stats?.todayCompleted ?? 0}
        icon={<CheckCircle2 className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="Upcoming"
        value={stats?.todayUpcoming ?? 0}
        icon={<Clock className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="No-Shows"
        value={stats?.todayNoShows ?? 0}
        icon={<UserX className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="Walk-Ins"
        value={stats?.todayWalkIns ?? 0}
        icon={<Footprints className="size-4" />}
        loading={loading}
      />
      <StatCard
        title="Monthly Revenue"
        value={stats ? formatPrice(stats.monthlyRevenue) : "..."}
        change={stats?.monthlyRevenueChange}
        icon={<TrendingUp className="size-4" />}
        loading={loading}
      />
    </div>
  );
}
