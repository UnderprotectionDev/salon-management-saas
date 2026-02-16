"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  TrendingUpDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMinutesAsTime } from "@/modules/booking/lib/constants";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";

// =============================================================================
// Helper Functions
// =============================================================================

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// =============================================================================
// Skeleton
// =============================================================================

function StatsSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// KPI Cards
// =============================================================================

function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
        ? TrendingDown
        : TrendingUpDown;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          {trend && (
            <TrendIcon
              className={`size-3 ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                    ? "text-red-600"
                    : "text-muted-foreground"
              }`}
            />
          )}
          <p>{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Spending Trend Chart
// =============================================================================

function SpendingTrendChart({
  data,
}: {
  data: Array<{ month: string; amount: number; visits: number }>;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>Your monthly spending over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No spending data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    Spending: item.amount / 100,
    Visits: item.visits,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Trend</CardTitle>
        <CardDescription>
          Your monthly spending and visit frequency (Last 12 months)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} tickMargin={8} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              tickFormatter={(value) => `₺${value}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Spending
                        </span>
                        <span className="font-bold text-muted-foreground">
                          {formatPrice(Number(payload[0]?.value ?? 0) * 100)}
                        </span>
                      </div>
                      {payload[1] && (
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Visits
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {payload[1].value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="Spending"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorSpending)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="Visits"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Favorite Services Table
// =============================================================================

function FavoriteServicesTable({
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
        <CardDescription>Your top 5 most booked services</CardDescription>
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

// =============================================================================
// Recent Appointments Timeline
// =============================================================================

function RecentAppointmentsTimeline({
  appointments,
}: {
  appointments: Array<{
    appointmentId: string;
    salonName: string;
    salonSlug: string;
    date: string;
    startTime: number;
    endTime: number;
    status: string;
    services: string[];
    total: number;
  }>;
}) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
          <CardDescription>Your appointment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            No appointments yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Visits</CardTitle>
        <CardDescription>Your last 10 completed appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt.appointmentId}
              className="flex gap-4 items-start pb-4 border-b last:border-b-0"
            >
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="text-xs text-muted-foreground">
                  {formatDate(appt.date)}
                </div>
                <div className="text-xs font-medium">
                  {formatMinutesAsTime(appt.startTime)}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Store className="size-3.5 text-muted-foreground" />
                  <span className="font-medium text-sm">{appt.salonName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {appt.services.join(", ")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
                  {formatPrice(appt.total)}
                </div>
                <Badge variant="secondary" className="text-xs mt-1">
                  {appt.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Salons Breakdown
// =============================================================================

function SalonsBreakdown({
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

// =============================================================================
// Main Dashboard Page
// =============================================================================

export default function CustomerStatsPage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const dashboard = useQuery(
    api.customerDashboard.getCustomerDashboard,
    user ? {} : "skip",
  );

  useEffect(() => {
    if (user === null) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  if (user === undefined || dashboard === undefined) {
    return <StatsSkeleton />;
  }

  if (user === null) {
    return <StatsSkeleton />;
  }

  if (dashboard.totalVisits === 0) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto p-4 lg:p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">My Stats</h1>
            <p className="text-muted-foreground mt-1">
              Track your salon visits and spending
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="size-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No visits yet</h2>
              <p className="text-muted-foreground text-center mb-6">
                Book your first appointment to see your statistics here
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Find a Salon
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate trends
  const lastMonthVisits =
    dashboard.monthlySpending.length >= 2
      ? dashboard.monthlySpending[dashboard.monthlySpending.length - 2].visits
      : 0;
  const thisMonthTrend =
    lastMonthVisits > 0
      ? dashboard.thisMonthVisits > lastMonthVisits
        ? "up"
        : dashboard.thisMonthVisits < lastMonthVisits
          ? "down"
          : "neutral"
      : "neutral";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Stats</h1>
          <p className="text-muted-foreground mt-1">
            Track your salon visits, spending, and favorite services
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Visits"
            value={dashboard.totalVisits.toString()}
            description="All-time completed appointments"
            icon={Calendar}
          />
          <KPICard
            title="This Month"
            value={dashboard.thisMonthVisits.toString()}
            description={
              lastMonthVisits > 0
                ? `${Math.abs(dashboard.thisMonthVisits - lastMonthVisits)} ${dashboard.thisMonthVisits > lastMonthVisits ? "more" : "less"} than last month`
                : "visits this month"
            }
            icon={Clock}
            trend={thisMonthTrend}
          />
          <KPICard
            title="Total Spent"
            value={formatPrice(dashboard.totalSpent)}
            description="Lifetime spending across all salons"
            icon={DollarSign}
          />
          <KPICard
            title="Monthly Average"
            value={formatPrice(dashboard.monthlyAvgSpent)}
            description="Average monthly spending (last 12 months)"
            icon={TrendingUpDown}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Spending Trend Chart */}
          <SpendingTrendChart data={dashboard.monthlySpending} />

          {/* Favorite Services */}
          <FavoriteServicesTable services={dashboard.favoriteServices} />
        </div>

        {/* Recent Appointments Timeline */}
        <RecentAppointmentsTimeline
          appointments={dashboard.recentAppointments}
        />

        {/* Salons Breakdown */}
        <SalonsBreakdown salons={dashboard.salons} />
      </div>
    </div>
  );
}
