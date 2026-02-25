"use client";

import {
  AlertTriangle,
  Edit2,
  History,
  MoreHorizontal,
  Package,
  PackageX,
  Trash2,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice } from "@/modules/services/lib/currency";
import type { Id } from "../../../../convex/_generated/dataModel";
import { StockIndicatorBar } from "./StockIndicatorBar";

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
  hasVariants?: boolean;
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
  // Variant price range (only for hasVariants products)
  minPrice?: number;
  maxPrice?: number;
  variantCount?: number;
  totalVariantStock?: number;
  // First option preview (for card chips)
  firstOptionName?: string;
  firstOptionValues?: string[];
};

type ProductCardProps = {
  product: Product;
  onClick: (product: Product) => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  onDelete: (product: Product) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (productId: Id<"products">) => void;
};

export function ProductCard({
  product,
  onClick,
  onEdit,
  onAdjustStock,
  onViewHistory,
  onDeactivate,
  onDelete,
  selectionMode,
  isSelected,
  onToggleSelect,
}: ProductCardProps) {
  const stockColor =
    product.stockQuantity === 0
      ? "text-destructive"
      : product.isLowStock
        ? "text-amber-600"
        : "text-muted-foreground";

  const handleCardClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(product._id);
    } else {
      onClick(product);
    }
  };

  return (
    <div
      className={`group relative rounded-lg border bg-card transition-shadow hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
    >
      {/* Accessible click target covering the entire card */}
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={handleCardClick}
        aria-label={`View ${product.name}`}
      />

      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
        {/* Selection checkbox */}
        {selectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(product._id)}
              className="size-5 bg-background/80 backdrop-blur-sm"
            />
          </div>
        )}
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
            className={`absolute top-2 text-xs ${selectionMode ? "left-10" : "left-2"}`}
          >
            Inactive
          </Badge>
        )}

        {/* Actions dropdown overlay */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
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

        {/* Price + Margin */}
        <div className="flex items-baseline gap-2">
          <p className="text-base font-semibold">
            {product.hasVariants &&
            product.minPrice !== undefined &&
            product.maxPrice !== undefined
              ? product.minPrice !== product.maxPrice
                ? `${formatPrice(product.minPrice)} – ${formatPrice(product.maxPrice)}`
                : formatPrice(product.minPrice)
              : formatPrice(product.sellingPrice)}
          </p>
          {!product.hasVariants && product.margin !== undefined && (
            <span
              className={`text-[11px] font-medium ${
                product.margin >= 30
                  ? "text-emerald-600"
                  : product.margin >= 15
                    ? "text-amber-600"
                    : "text-destructive"
              }`}
            >
              {product.margin}%
            </span>
          )}
        </div>

        {/* Cost price or variant count + chips */}
        {product.hasVariants && (product.variantCount ?? 0) > 0 ? (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground/70">
              {product.variantCount} variant
              {product.variantCount !== 1 ? "s" : ""}
            </p>
            {product.firstOptionValues &&
              product.firstOptionValues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.firstOptionValues.slice(0, 5).map((val) => (
                    <Badge
                      key={val}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {val}
                    </Badge>
                  ))}
                  {product.firstOptionValues.length > 5 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      +{product.firstOptionValues.length - 5}
                    </Badge>
                  )}
                </div>
              )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/70 tabular-nums">
            Cost: {formatPrice(product.costPrice)}
          </p>
        )}

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

        {/* Stock bar */}
        <StockIndicatorBar
          stockQuantity={product.stockQuantity}
          lowStockThreshold={product.lowStockThreshold}
        />
      </div>
    </div>
  );
}
