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
import { NewVsReturningChart } from "./NewVsReturningChart";
import { ReportCard } from "./ReportCard";
import { TopCustomersTable } from "./TopCustomersTable";

export function CustomerReport() {
  const { activeOrganization } = useOrganization();
  const { from, to } = useDateRange();

  const report = useQuery(
    api.reports.getCustomerReport,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  const loading = activeOrganization != null && report === undefined;

  function handleExport() {
    if (!report) return;
    const headers = [
      "Name",
      "Phone",
      "Appointments",
      "Revenue (TRY)",
      "Last Visit",
    ];
    const rows = report.topCustomers.map((c) => [
      sanitizeCsvValue(c.name),
      sanitizeCsvValue(c.phone),
      c.appointments,
      (c.revenue / 100).toFixed(2),
      c.lastVisitDate ?? "",
    ]);
    downloadCsv(headers, rows, reportFilename("customers", from, to));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <DateRangePicker />
        {report && <ExportCsvButton onClick={handleExport} />}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportCard
              title="Total Active Customers"
              value={String(report.totalActive)}
            />
            <ReportCard
              title="New in Period"
              value={String(report.newInPeriod)}
            />
            <ReportCard
              title="Retention Rate"
              value={`${report.retentionRate}%`}
            />
            <ReportCard
              title="Avg Appointments"
              value={String(report.avgAppointmentsPerCustomer)}
              suffix="per customer"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New vs Returning Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <NewVsReturningChart data={report.monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Customers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <TopCustomersTable data={report.topCustomers} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
