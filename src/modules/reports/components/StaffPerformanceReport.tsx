"use client";

import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { useDateRange } from "../hooks/useDateRange";
import { downloadCsv, reportFilename, sanitizeCsvValue } from "../lib/csv";
import { DateRangePicker } from "./DateRangePicker";
import { ExportCsvButton } from "./ExportCsvButton";
import { StaffPerformanceTable } from "./StaffPerformanceTable";

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
        <Skeleton className="h-[300px]" />
      ) : report ? (
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffPerformanceTable data={report.staff} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
