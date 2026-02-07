"use client";

import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import {
  AddCustomerDialog,
  CustomerSearch,
  CustomerTable,
} from "@/modules/customers";
import { api } from "../../../../../convex/_generated/api";

export default function CustomersPage() {
  const { activeOrganization, currentRole } = useOrganization();
  const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const hasAdvancedFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== "",
  );

  // Use advancedSearch when filters are active, otherwise use list
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
        {isAdminOrOwner && (
          <AddCustomerDialog organizationId={activeOrganization._id} />
        )}
      </div>

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
            {!debouncedSearch && !hasAdvancedFilters && isAdminOrOwner && (
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
          <CustomerTable
            customers={customers}
            organizationId={activeOrganization._id}
            isAdminOrOwner={isAdminOrOwner}
          />
        </>
      )}
    </div>
  );
}
