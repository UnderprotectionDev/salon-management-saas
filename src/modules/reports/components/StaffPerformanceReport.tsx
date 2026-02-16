"use client";

import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import { useDateRange } from "../hooks/useDateRange";
import { downloadCsv, reportFilename, sanitizeCsvValue } from "../lib/csv";
import { DateRangePicker } from "./DateRangePicker";
import { ExportCsvButton } from "./ExportCsvButton";
import { ReportCard } from "./ReportCard";
import { StaffPerformanceTable } from "./StaffPerformanceTable";
import { StaffUtilizationChart } from "./StaffUtilizationChart";

export function StaffPerformanceReport() {
  const { activeOrganization } = useOrganization();
  const { from, to } = useDateRange();

  const report = useQuery(
    api.reports.getStaffPerformanceReport,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  const loading = activeOrganization != null && report === undefined;

  // Calculate aggregates for KPI cards
  const aggregates = report
    ? {
        totalAppointments: report.staff.reduce(
          (sum, s) => sum + s.totalAppointments,
          0,
        ),
        totalRevenue: report.staff.reduce((sum, s) => sum + s.revenue, 0),
        avgUtilization:
          report.staff.length > 0
            ? Math.round(
                report.staff.reduce((sum, s) => sum + s.utilization, 0) /
                  report.staff.length,
              )
            : 0,
        highestNoShow: report.staff.reduce(
          (max, s) => {
            const rate =
              s.totalAppointments > 0
                ? (s.noShows / s.totalAppointments) * 100
                : 0;
            return rate > max.rate ? { name: s.staffName, rate } : max;
          },
          { name: "", rate: 0 },
        ),
      }
    : null;

  function handleExport() {
    if (!report) return;
    const headers = [
      "Name",
      "Appointments",
      "Completed",
      "No-shows",
      "Cancelled",
      "Revenue (TRY)",
      "Utilization %",
    ];
    const rows = report.staff.map((s) => [
      sanitizeCsvValue(s.staffName),
      s.totalAppointments,
      s.completed,
      s.noShows,
      s.cancelled,
      ((s.revenue ?? 0) / 100).toFixed(2),
      s.utilization,
    ]);
    downloadCsv(headers, rows, reportFilename("staff_performance", from, to));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <DateRangePicker />
        {report && <ExportCsvButton onClick={handleExport} />}
      </div>

      {loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px]" />
            ))}
          </div>
          <Skeleton className="h-[300px]" />
        </>
      ) : report && aggregates ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportCard
              title="Total Appointments"
              value={String(aggregates.totalAppointments)}
            />
            <ReportCard
              title="Total Revenue"
              value={formatPrice(aggregates.totalRevenue)}
            />
            <ReportCard
              title="Avg Utilization"
              value={`${aggregates.avgUtilization}%`}
            />
            <ReportCard
              title="Highest No-Show Rate"
              value={
                aggregates.highestNoShow.rate > 0
                  ? `${aggregates.highestNoShow.name} (${Math.round(aggregates.highestNoShow.rate)}%)`
                  : "None"
              }
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Staff Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffUtilizationChart data={report.staff} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffPerformanceTable data={report.staff} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
