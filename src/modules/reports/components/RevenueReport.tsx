"use client";

import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import { useDateRange } from "../hooks/useDateRange";
import { downloadCsv, reportFilename } from "../lib/csv";
import { DateRangePicker } from "./DateRangePicker";
import { ExportCsvButton } from "./ExportCsvButton";
import { ReportCard } from "./ReportCard";
import { RevenueByServiceTable } from "./RevenueByServiceTable";
import { RevenueByStaffTable } from "./RevenueByStaffTable";
import { RevenueChart } from "./RevenueChart";
import { StatusBar } from "./StatusBar";

export function RevenueReport() {
  const { activeOrganization } = useOrganization();
  const { from, to } = useDateRange();

  const report = useQuery(
    api.reports.getRevenueReport,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  const loading = activeOrganization != null && report === undefined;

  function handleExport() {
    if (!report) return;
    const headers = ["Date", "Revenue (TRY)", "Appointments", "Completed"];
    const rows = report.daily.map((d) => [
      d.date,
      (d.revenue / 100).toFixed(2),
      d.appointments,
      d.completed,
    ]);
    downloadCsv(headers, rows, reportFilename("revenue", from, to));
  }

  const hasRevenue = report && report.totalRevenue > 0;
  const hasExpected = report && report.expectedRevenue > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <DateRangePicker />
        {report && <ExportCsvButton onClick={handleExport} />}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReportCard
              title="Total Revenue"
              value={formatPrice(report.totalRevenue)}
              change={report.revenueChange}
            />
            <ReportCard
              title="Expected Revenue"
              value={formatPrice(report.expectedRevenue)}
            />
            <ReportCard
              title="Avg per Appointment"
              value={formatPrice(report.avgPerAppointment)}
            />
            <ReportCard
              title="Total Appointments"
              value={String(report.totalAppointments)}
            />
            <ReportCard
              title="Completion Rate"
              value={`${report.completionRate}%`}
            />
            <ReportCard
              title="Cancellation Rate"
              value={`${report.cancellationRate}%`}
            />
          </div>

          <StatusBar data={report.statusBreakdown} />

          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue & Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasRevenue && !hasExpected ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No completed appointments yet. Revenue will appear here as
                  appointments are completed.
                </div>
              ) : (
                <RevenueChart data={report.daily} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Service</CardTitle>
              </CardHeader>
              <CardContent>
                {report.byService.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Complete appointments to see revenue breakdown by service.
                  </p>
                ) : (
                  <RevenueByServiceTable data={report.byService} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Staff</CardTitle>
              </CardHeader>
              <CardContent>
                {report.byStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Complete appointments to see revenue breakdown by staff.
                  </p>
                ) : (
                  <RevenueByStaffTable data={report.byStaff} />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
