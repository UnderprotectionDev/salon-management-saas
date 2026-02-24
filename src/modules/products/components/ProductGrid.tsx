"use client";

import { useMutation, useQuery } from "convex/react";
import { Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { InventoryHistorySheet } from "./InventoryHistorySheet";
import { type Product, ProductCard } from "./ProductCard";
import { ProductWizardDialog } from "./ProductWizardDialog";

export type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type SortOption =
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "stock_asc"
  | "newest";

export type ProductFilters = {
  search: string;
  status: "all" | "active" | "inactive";
  stockLevel: StockFilter;
  sort: SortOption;
};

type ProductGridProps = {
  organizationId: Id<"organization">;
  categoryId: string | null;
  filters: ProductFilters;
};

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let filtered = [...products];

  // Search filter (name, brand, SKU)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q),
    );
  }

  // Status filter
  if (filters.status !== "all") {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  // Stock level filter
  if (filters.stockLevel === "in_stock") {
    filtered = filtered.filter((p) => p.stockQuantity > 0 && !p.isLowStock);
  } else if (filters.stockLevel === "low_stock") {
    filtered = filtered.filter((p) => p.isLowStock && p.stockQuantity > 0);
  } else if (filters.stockLevel === "out_of_stock") {
    filtered = filtered.filter((p) => p.stockQuantity === 0);
  }

  // Sort
  switch (filters.sort) {
    case "name_asc":
      filtered.sort((a, b) => a.name.localeCompare(b.name, "tr"));
      break;
    case "name_desc":
      filtered.sort((a, b) => b.name.localeCompare(a.name, "tr"));
      break;
    case "price_asc":
      filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
      break;
    case "price_desc":
      filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
      break;
    case "stock_asc":
      filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
      break;
    case "newest":
      filtered.sort(
        (a, b) => (b as any)._creationTime - (a as any)._creationTime,
      );
      break;
  }

  return filtered;
}

export function ProductGrid({
  organizationId,
  categoryId,
  filters,
}: ProductGridProps) {
  const products = useQuery(api.products.list, {
    organizationId,
    categoryId: categoryId
      ? (categoryId as Id<"productCategories">)
      : undefined,
  }) as Product[] | undefined;

  const deactivateProduct = useMutation(api.products.deactivate);

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<{
    id: Id<"products">;
    name: string;
    stock: number;
  } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{
    id: Id<"products">;
    name: string;
  } | null>(null);

  if (products === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const filtered = applyFilters(products, filters);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          {products.length === 0
            ? categoryId
              ? "No products in this category"
              : "No products yet"
            : "No products match your filters"}
        </p>
        {products.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Add Product&quot; to create your first product
          </p>
        )}
      </div>
    );
  }

  const handleDeactivate = async (product: Product) => {
    try {
      await deactivateProduct({ organizationId, productId: product._id });
      toast.success(`${product.name} deactivated`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate product",
      );
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onEdit={setEditTarget}
            onAdjustStock={(p) =>
              setStockTarget({
                id: p._id,
                name: p.name,
                stock: p.stockQuantity,
              })
            }
            onViewHistory={(p) => setHistoryTarget({ id: p._id, name: p.name })}
            onDeactivate={handleDeactivate}
          />
        ))}
      </div>

      {/* Edit Product Dialog */}
      <ProductWizardDialog
        key={editTarget?._id ?? "edit"}
        mode="edit"
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        product={editTarget}
        organizationId={organizationId}
      />

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        open={!!stockTarget}
        onOpenChange={(o) => !o && setStockTarget(null)}
        productId={stockTarget?.id ?? null}
        productName={stockTarget?.name ?? ""}
        currentStock={stockTarget?.stock ?? 0}
        organizationId={organizationId}
      />

      {/* Inventory History Sheet */}
      <InventoryHistorySheet
        open={!!historyTarget}
        onOpenChange={(o) => !o && setHistoryTarget(null)}
        productId={historyTarget?.id ?? null}
        productName={historyTarget?.name ?? ""}
        organizationId={organizationId}
      />
    </>
  );
}
