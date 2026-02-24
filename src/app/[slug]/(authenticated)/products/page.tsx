"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/modules/organization";
import { CategorySidebar } from "@/modules/products/components/CategorySidebar";
import { ProductWizardDialog } from "@/modules/products/components/ProductWizardDialog";
import { InventoryStatsBar } from "@/modules/products/components/InventoryStatsBar";
import { LowStockBanner } from "@/modules/products/components/LowStockBanner";
import { ProductFiltersBar } from "@/modules/products/components/ProductFilters";
import {
  type ProductFilters,
  type StockFilter,
  ProductGrid,
} from "@/modules/products/components/ProductGrid";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function ProductsPage() {
  const { activeOrganization, currentRole, isLoading } = useOrganization();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "all",
    stockLevel: "all",
    sort: "name_asc",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your salon&apos;s product catalog and inventory
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Product
        </Button>
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

      {/* Content: Category Sidebar + Products Grid */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Category Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <CategorySidebar
            organizationId={activeOrganization._id}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          <ProductGrid
            organizationId={activeOrganization._id}
            categoryId={selectedCategoryId}
            filters={filters}
          />
        </div>
      </div>

      {/* Add Product Wizard */}
      <ProductWizardDialog
        mode="add"
        open={addOpen}
        onOpenChange={setAddOpen}
        organizationId={activeOrganization._id}
        defaultCategoryId={
          selectedCategoryId
            ? (selectedCategoryId as Id<"productCategories">)
            : undefined
        }
      />
    </div>
  );
}
