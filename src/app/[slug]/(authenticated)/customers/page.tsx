"use client";

import { useQuery } from "convex/react";
import { Download, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import {
  AddCustomerDialog,
  CustomerDataGrid,
  CustomerListStatsBar,
  CustomerSearch,
} from "@/modules/customers";
import { downloadCsv, sanitizeCsvValue } from "@/modules/reports/lib/csv";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../../convex/_generated/api";

export default function CustomersPage() {
  const { activeOrganization, currentRole } = useOrganization();
  const isOwner = currentRole === "owner";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<{
    accountStatus?: string;
    source?: string;
    totalVisitsMin?: number;
    totalVisitsMax?: number;
    totalSpentMin?: number;
    totalSpentMax?: number;
    tags?: string;
  }>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const hasAdvancedFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== "",
  );

  const advancedResults = useQuery(
    api.customers.advancedSearch,
    activeOrganization && hasAdvancedFilters
      ? {
          organizationId: activeOrganization._id,
          query: debouncedSearch || undefined,
          accountStatus: filters.accountStatus as
            | "guest"
            | "recognized"
            | "prompted"
            | "registered"
            | undefined,
          source: filters.source as
            | "online"
            | "walk_in"
            | "phone"
            | "staff"
            | "import"
            | undefined,
          totalVisitsMin: filters.totalVisitsMin,
          totalVisitsMax: filters.totalVisitsMax,
          totalSpentMin: filters.totalSpentMin,
          totalSpentMax: filters.totalSpentMax,
          tags: filters.tags
            ? filters.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
        }
      : "skip",
  );

  const simpleResults = useQuery(
    api.customers.list,
    activeOrganization && !hasAdvancedFilters
      ? {
          organizationId: activeOrganization._id,
          search: debouncedSearch || undefined,
        }
      : "skip",
  );

  const customers = hasAdvancedFilters
    ? advancedResults?.customers
    : simpleResults;
  const isLoading = customers === undefined;

  const handleExportCsv = () => {
    if (!customers || customers.length === 0) return;

    const headers = [
      "Name",
      "Phone",
      "Email",
      "Status",
      "Visits",
      "Spent (TL)",
      "Last Visit",
      "Tags",
      "Source",
    ];
    const rows = customers.map((c) => [
      sanitizeCsvValue(c.name),
      sanitizeCsvValue(c.phone),
      sanitizeCsvValue(c.email ?? ""),
      sanitizeCsvValue(c.accountStatus ?? ""),
      c.totalVisits ?? 0,
      (c.totalSpent ?? 0) / 100,
      sanitizeCsvValue(c.lastVisitDate ?? ""),
      sanitizeCsvValue(c.tags?.join(", ") ?? ""),
      sanitizeCsvValue(c.source ?? ""),
    ]);

    const date = new Date().toISOString().split("T")[0];
    downloadCsv(headers, rows, `customers_${date}.csv`);
  };

  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your salon&apos;s customer database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!customers || customers.length === 0}
          >
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
          <AddCustomerDialog organizationId={activeOrganization._id} />
        </div>
      </div>

      <CustomerListStatsBar organizationId={activeOrganization._id} />

      <CustomerSearch
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Users className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">
              {debouncedSearch || hasAdvancedFilters
                ? "No customers found"
                : "No customers yet"}
            </h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {debouncedSearch || hasAdvancedFilters
                ? "Try adjusting your search or filters"
                : "Add your first customer to get started"}
            </p>
            {!debouncedSearch && !hasAdvancedFilters && (
              <AddCustomerDialog organizationId={activeOrganization._id} />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {hasAdvancedFilters && advancedResults && (
            <p className="text-sm text-muted-foreground">
              {advancedResults.totalCount} customer
              {advancedResults.totalCount !== 1 ? "s" : ""} found
            </p>
          )}
          <CustomerDataGrid
            customers={customers}
            organizationId={activeOrganization._id}
            isOwner={isOwner}
          />
        </>
      )}
    </div>
  );
}
