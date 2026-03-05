"use client";

import { CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/modules/organization";
import { AddProductSheet } from "@/modules/products/components/AddProductSheet";
import { InventoryStatsBar } from "@/modules/products/components/InventoryStatsBar";
import { LowStockBanner } from "@/modules/products/components/LowStockBanner";
import { ProductCategoryFilterChips } from "@/modules/products/components/ProductCategoryFilterChips";
import {
  type ProductFilters,
  ProductFiltersBar,
  type StockFilter,
} from "@/modules/products/components/ProductFilters";
import { ProductsList } from "@/modules/products/components/ProductsList";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function ProductsPage() {
  const { activeOrganization, currentRole, isLoading } = useOrganization();
  const router = useRouter();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "all",
    stockLevel: "all",
    sort: "default",
  });

  const isOwner = currentRole === "owner";

  // Redirect non-owners (staff cannot access products)
  useEffect(() => {
    if (!isLoading && activeOrganization && currentRole === "staff") {
      router.replace(`/${activeOrganization.slug}/dashboard`);
    }
  }, [isLoading, currentRole, router, activeOrganization]);

  if (!activeOrganization || isLoading) return null;
  if (!isOwner) return null;

  const handleFilterStock = (stockFilter: StockFilter) => {
    setFilters((prev) => ({ ...prev, stockLevel: stockFilter }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your salon&apos;s product catalog and inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSelectionMode(!selectionMode)}
          >
            <CheckSquare className="mr-1.5 size-4" />
            {selectionMode ? "Done" : "Select"}
          </Button>
          <AddProductSheet
            organizationId={activeOrganization._id}
            defaultCategoryId={
              selectedCategoryId
                ? (selectedCategoryId as Id<"productCategories">)
                : undefined
            }
          />
        </div>
      </div>

      {/* Low Stock Banner */}
      <LowStockBanner
        organizationId={activeOrganization._id}
        onViewLowStock={handleFilterStock}
      />

      {/* Inventory Stats */}
      <InventoryStatsBar
        organizationId={activeOrganization._id}
        onFilterStock={handleFilterStock}
      />

      {/* Search & Filters */}
      <ProductFiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Category Filter Chips */}
      <ProductCategoryFilterChips
        organizationId={activeOrganization._id}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        isOwner={isOwner}
      />

      {/* Products List */}
      <ProductsList
        organizationId={activeOrganization._id}
        categoryId={selectedCategoryId}
        filters={filters}
        selectionMode={selectionMode}
      />
    </div>
  );
}
