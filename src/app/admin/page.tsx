"use client";

import { useQuery } from "convex/react";
import {
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../convex/_generated/api";

function formatCurrency(kurus: number): string {
  return `₺${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function RecentActionsPreview() {
  const actions = useQuery(api.admin.getActionLog, { limit: 5 });

  if (!actions) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div
          key={action._id}
          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
        >
          <div>
            <span className="font-medium">{action.adminEmail}</span>{" "}
            <span className="text-muted-foreground">{action.action}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(action.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const stats = useQuery(api.admin.getPlatformStats);

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toString()}
          description={`+${stats.last30Days.newUsers} last 30 days`}
          icon={Users}
        />
        <StatCard
          title="Total Organizations"
          value={stats.totalOrganizations.toString()}
          description={`+${stats.last30Days.newOrganizations} last 30 days`}
          icon={Building2}
        />
        <StatCard
          title="Active Organizations"
          value={stats.activeOrganizations.toString()}
          description={`of ${stats.totalOrganizations} total`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Appointments"
          value={stats.totalAppointments.toString()}
          description={`+${stats.last30Days.appointments} last 30 days`}
          icon={Calendar}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          description={`+${formatCurrency(stats.last30Days.revenue)} last 30 days`}
          icon={DollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
          <CardDescription>
            Last 5 admin actions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentActionsPreview />
        </CardContent>
      </Card>
    </div>
  );
}
