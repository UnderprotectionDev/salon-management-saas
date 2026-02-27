"use client";

import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganization } from "@/modules/organization";
import {
  downloadCsv,
  reportFilename,
  sanitizeCsvValue,
} from "@/modules/reports/lib/csv";
import { api } from "../../../../convex/_generated/api";
import { getCategoryLabel } from "../lib/categories";
import { getPaymentMethodLabel, getRevenueTypeLabel } from "../lib/constants";

export function ExportMenu({ from, to }: { from: string; to: string }) {
  const { activeOrganization } = useOrganization();

  const expenses = useQuery(
    api.expenses.list,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  const revenue = useQuery(
    api.additionalRevenue.list,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  function handleExportExpenses() {
    if (!expenses) return;
    const headers = [
      "Date",
      "Category",
      "Description",
      "Amount (TRY)",
      "Payment",
      "Vendor",
      "Recurrence",
    ];
    const rows = expenses.map((e) => [
      sanitizeCsvValue(e.date),
      sanitizeCsvValue(getCategoryLabel(e.category)),
      sanitizeCsvValue(e.description ?? ""),
      (e.amount / 100).toFixed(2),
      sanitizeCsvValue(getPaymentMethodLabel(e.paymentMethod)),
      sanitizeCsvValue(e.vendor ?? ""),
      sanitizeCsvValue(e.recurrence),
    ]);
    downloadCsv(headers, rows, reportFilename("expenses", from, to));
  }

  function handleExportRevenue() {
    if (!revenue) return;
    const headers = ["Date", "Type", "Amount (TRY)", "Payment", "Description"];
    const rows = revenue.map((r) => [
      sanitizeCsvValue(r.date),
      sanitizeCsvValue(getRevenueTypeLabel(r.type)),
      (r.amount / 100).toFixed(2),
      sanitizeCsvValue(getPaymentMethodLabel(r.paymentMethod)),
      sanitizeCsvValue(r.description ?? ""),
    ]);
    downloadCsv(headers, rows, reportFilename("additional_revenue", from, to));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-1 size-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportExpenses}>
          Export Expenses (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportRevenue}>
          Export Revenue (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
