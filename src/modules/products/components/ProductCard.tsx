"use client";

import {
  AlertTriangle,
  Edit2,
  History,
  MoreHorizontal,
  Package,
  PackageX,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice } from "@/modules/services/lib/currency";
import type { Id } from "../../../../convex/_generated/dataModel";

export type Product = {
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
  imageUrls?: string[];
  imageStorageIds?: Id<"_storage">[];
  supplierInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
};

type ProductCardProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onDeactivate: (product: Product) => void;
};

export function ProductCard({
  product,
  onEdit,
  onAdjustStock,
  onViewHistory,
  onDeactivate,
}: ProductCardProps) {
  const stockColor =
    product.stockQuantity === 0
      ? "text-destructive"
      : product.isLowStock
        ? "text-amber-600"
        : "text-muted-foreground";

  return (
    <div className="group relative rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
        {product.imageUrls?.[0] ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Status badge overlay */}
        {product.status === "inactive" && (
          <Badge
            variant="destructive"
            className="absolute top-2 left-2 text-xs"
          >
            Inactive
          </Badge>
        )}

        {/* Actions dropdown overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 shadow-sm"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit2 className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAdjustStock(product)}>
                <Warehouse className="mr-2 size-4" />
                Adjust Stock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(product)}>
                <History className="mr-2 size-4" />
                Inventory History
              </DropdownMenuItem>
              {product.status === "active" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeactivate(product)}
                    className="text-destructive"
                  >
                    <PackageX className="mr-2 size-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Name + Brand */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate leading-tight">
            {product.name}
          </p>
          {product.brand && (
            <p className="text-xs text-muted-foreground truncate">
              {product.brand}
            </p>
          )}
        </div>

        {/* Category badge */}
        {product.categoryName && (
          <Badge variant="outline" className="text-xs font-normal">
            {product.categoryName}
          </Badge>
        )}

        {/* Price */}
        <p className="text-base font-semibold">
          {formatPrice(product.sellingPrice)}
        </p>

        {/* Stock indicator */}
        <div className={`flex items-center gap-1.5 text-xs ${stockColor}`}>
          {product.isLowStock && (
            <AlertTriangle className="size-3 text-amber-500 shrink-0" />
          )}
          <span className="tabular-nums font-medium">
            {product.stockQuantity === 0
              ? "Out of stock"
              : `${product.stockQuantity} in stock`}
          </span>
        </div>
      </div>
    </div>
  );
}
