"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Edit2,
  History,
  MoreHorizontal,
  PackageX,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { EditProductDialog } from "./EditProductDialog";
import { InventoryHistorySheet } from "./InventoryHistorySheet";

type ProductsListProps = {
  organizationId: Id<"organization">;
  categoryId: string | null;
};

type Product = {
  _id: Id<"products">;
  name: string;
  description?: string;
  categoryId?: Id<"productCategories">;
  categoryName?: string;
  sku?: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  status: "active" | "inactive";
  isLowStock: boolean;
  margin?: number;
  supplierInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
};

function formatPrice(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(kurus / 100);
}

export function ProductsList({
  organizationId,
  categoryId,
}: ProductsListProps) {
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
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Warehouse className="size-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {categoryId ? "No products in this category" : "No products yet"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click &quot;Add Product&quot; to create your first product
        </p>
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="hidden sm:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">SKU</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Selling Price</TableHead>
            <TableHead className="hidden lg:table-cell">Margin</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product._id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  {product.brand && (
                    <p className="text-xs text-muted-foreground truncate">
                      {product.brand}
                    </p>
                  )}
                </div>
              </TableCell>

              <TableCell className="hidden sm:table-cell">
                {product.categoryName ? (
                  <Badge variant="outline">{product.categoryName}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="hidden md:table-cell">
                <span className="text-xs text-muted-foreground font-mono">
                  {product.sku ?? "—"}
                </span>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium tabular-nums">
                    {product.stockQuantity}
                  </span>
                  {product.isLowStock && (
                    <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                  )}
                </div>
              </TableCell>

              <TableCell>
                <span className="text-sm tabular-nums">
                  {formatPrice(product.sellingPrice)}
                </span>
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                {product.margin !== undefined ? (
                  <span
                    className={
                      product.margin < 0
                        ? "text-destructive text-sm"
                        : "text-sm"
                    }
                  >
                    {product.margin}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="hidden sm:table-cell">
                <Badge
                  variant={
                    product.status === "active" ? "default" : "destructive"
                  }
                >
                  {product.status}
                </Badge>
              </TableCell>

              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(product)}>
                      <Edit2 className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setStockTarget({
                          id: product._id,
                          name: product.name,
                          stock: product.stockQuantity,
                        })
                      }
                    >
                      <Warehouse className="mr-2 size-4" />
                      Adjust Stock
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setHistoryTarget({
                          id: product._id,
                          name: product.name,
                        })
                      }
                    >
                      <History className="mr-2 size-4" />
                      Inventory History
                    </DropdownMenuItem>
                    {product.status === "active" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(product)}
                          className="text-destructive"
                        >
                          <PackageX className="mr-2 size-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Product Dialog */}
      <EditProductDialog
        key={editTarget?._id}
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
