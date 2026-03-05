"use client";

import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Edit2,
  History,
  Mail,
  Package,
  PackageX,
  Phone,
  Trash2,
  Truck,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PriceHistoryTimeline } from "./PriceHistoryTimeline";
import { StockIndicatorBar } from "./StockIndicatorBar";
import { VariantMatrixTable } from "./VariantMatrixTable";

type ProductDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
  organizationId: Id<"organization">;
  onEdit: (productId: Id<"products">) => void;
  onAdjustStock: (
    productId: Id<"products">,
    name: string,
    stock: number,
  ) => void;
  onDeactivate: (productId: Id<"products">) => void;
  onDelete: (productId: Id<"products">) => void;
  onViewFullHistory: (productId: Id<"products">, name: string) => void;
};

const typeConfig: Record<string, { label: string; tag: string }> = {
  restock: { label: "Restock", tag: "IN" },
  adjustment: { label: "Adjustment", tag: "ADJ" },
  waste: { label: "Waste", tag: "DMG" },
};

function formatTxDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ProductDetailSheet({
  open,
  onOpenChange,
  productId,
  organizationId,
  onEdit,
  onAdjustStock,
  onDeactivate,
  onDelete,
  onViewFullHistory,
}: ProductDetailSheetProps) {
  const detail = useQuery(
    api.products.getDetail,
    productId ? { organizationId, productId } : "skip",
  );

  const loading = productId !== null && detail === undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col h-full">
            <SheetHeader className="sr-only">
              <SheetTitle>Product Details</SheetTitle>
              <SheetDescription>Loading product details</SheetDescription>
            </SheetHeader>
            <DetailSkeleton />
          </div>
        ) : detail ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 pt-5 pb-0 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-xl font-semibold tracking-tight leading-tight truncate">
                    {detail.name}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Product details for {detail.name}
                  </SheetDescription>
                  <div className="flex items-center gap-2 mt-1">
                    {detail.brand && (
                      <span className="text-xs text-muted-foreground">
                        {detail.brand}
                      </span>
                    )}
                    {detail.sku && (
                      <span className="text-xs text-muted-foreground font-mono">
                        SKU: {detail.sku}
                      </span>
                    )}
                    {detail.status === "inactive" && (
                      <Badge variant="destructive" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 px-6 pt-3 pb-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(detail._id);
                  onOpenChange(false);
                }}
              >
                <Edit2 className="mr-1.5 size-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAdjustStock(detail._id, detail.name, detail.stockQuantity);
                  onOpenChange(false);
                }}
              >
                <Warehouse className="mr-1.5 size-3.5" />
                Adjust Stock
              </Button>
              {detail.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    onDeactivate(detail._id);
                    onOpenChange(false);
                  }}
                >
                  <PackageX className="mr-1.5 size-3.5" />
                  Deactivate
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onDelete(detail._id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
            </div>

            <Separator className="mt-2 shrink-0" />

            {/* Tabs */}
            <Tabs
              defaultValue="overview"
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-6 mt-3 w-fit shrink-0">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                {detail.hasVariants && (
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                )}
                <TabsTrigger value="supplier">Supplier</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 min-h-0">
                {/* Overview Tab */}
                <TabsContent
                  value="overview"
                  className="mt-0 px-6 py-4 space-y-5"
                >
                  {/* Image Gallery */}
                  {detail.imageUrls && detail.imageUrls.length > 0 ? (
                    <div className="space-y-2">
                      {/* Hero image */}
                      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={detail.imageUrls[0]}
                          alt={detail.name}
                          fill
                          className="object-cover"
                          sizes="520px"
                        />
                      </div>
                      {/* Thumbnails */}
                      {detail.imageUrls.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {detail.imageUrls.slice(1).map((url, i) => (
                            <div
                              key={`${url}-${i}`}
                              className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted"
                            >
                              <Image
                                src={url}
                                alt={`${detail.name} ${i + 2}`}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-muted">
                      <Package className="size-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Description */}
                  {detail.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {detail.description}
                    </p>
                  )}

                  {/* Category */}
                  {detail.categoryName && (
                    <div>
                      <Badge variant="outline" className="text-xs font-normal">
                        {detail.categoryName}
                      </Badge>
                    </div>
                  )}

                  {/* Pricing Block */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Selling Price
                      </span>
                      <span className="text-lg font-semibold">
                        {formatPrice(detail.sellingPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Cost Price
                      </span>
                      <span className="text-sm tabular-nums">
                        {formatPrice(detail.costPrice)}
                      </span>
                    </div>
                    {detail.margin !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Margin
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            detail.margin >= 30
                              ? "text-emerald-600"
                              : detail.margin >= 15
                                ? "text-amber-600"
                                : "text-destructive"
                          }`}
                        >
                          {Number(detail.margin).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price History */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Price Changes
                    </p>
                    <PriceHistoryTimeline
                      productId={detail._id}
                      organizationId={organizationId}
                    />
                  </div>

                  {/* Stock Block */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Current Stock
                      </span>
                      <div className="flex items-center gap-2">
                        {detail.isLowStock && (
                          <AlertTriangle className="size-3.5 text-amber-500" />
                        )}
                        <span className="text-lg font-semibold tabular-nums">
                          {detail.stockQuantity}
                        </span>
                      </div>
                    </div>
                    {detail.lowStockThreshold !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Low Stock Threshold
                        </span>
                        <span className="text-sm tabular-nums">
                          {detail.lowStockThreshold}
                        </span>
                      </div>
                    )}
                    <StockIndicatorBar
                      stockQuantity={detail.stockQuantity}
                      lowStockThreshold={detail.lowStockThreshold}
                    />
                  </div>
                </TabsContent>

                {/* Stock Tab */}
                <TabsContent value="stock" className="mt-0 px-6 py-4 space-y-4">
                  {/* Current stock hero */}
                  <div className="text-center py-3">
                    <span className="text-4xl font-light tabular-nums">
                      {detail.stockQuantity}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      units in stock
                    </p>
                    <StockIndicatorBar
                      stockQuantity={detail.stockQuantity}
                      lowStockThreshold={detail.lowStockThreshold}
                      className="mt-3 max-w-48 mx-auto"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        onAdjustStock(
                          detail._id,
                          detail.name,
                          detail.stockQuantity,
                        );
                        onOpenChange(false);
                      }}
                    >
                      <Warehouse className="mr-1.5 size-3.5" />
                      Adjust Stock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        onViewFullHistory(detail._id, detail.name);
                        onOpenChange(false);
                      }}
                    >
                      <History className="mr-1.5 size-3.5" />
                      Full History
                    </Button>
                  </div>

                  <Separator />

                  {/* Recent transactions */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      Recent Activity
                    </p>
                    {detail.recentTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <History className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          No stock changes yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {detail.recentTransactions.map((tx, index) => {
                          const config = typeConfig[tx.type] ?? {
                            label: "Other",
                            tag: "OTH",
                          };
                          const isIncrease = tx.quantity > 0;
                          const isDecrease = tx.quantity < 0;
                          const isLast =
                            index === detail.recentTransactions.length - 1;

                          return (
                            <div
                              key={tx._id}
                              className={`flex ${!isLast ? "border-b border-border/60" : ""}`}
                            >
                              <div
                                className={`w-[3px] shrink-0 rounded-full my-2.5 ${
                                  isIncrease
                                    ? "bg-emerald-500"
                                    : isDecrease
                                      ? "bg-destructive"
                                      : "bg-muted-foreground"
                                }`}
                              />
                              <div className="flex items-center justify-between flex-1 py-2.5 pl-3 min-w-0">
                                <div className="min-w-0">
                                  <p className="text-sm">
                                    <span
                                      className={`italic ${
                                        tx.type === "waste"
                                          ? "line-through text-muted-foreground"
                                          : ""
                                      }`}
                                    >
                                      {config.label}
                                    </span>
                                    <sup className="text-[8px] text-muted-foreground/60 ml-0.5">
                                      ({config.tag})
                                    </sup>
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {formatTxDate(tx.createdAt)}
                                    {tx.staffName && ` · ${tx.staffName}`}
                                    {tx.note && ` — ${tx.note}`}
                                  </p>
                                </div>
                                <div className="text-sm font-semibold tabular-nums whitespace-nowrap pl-3">
                                  {tx.previousStock} → {tx.newStock}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Variants Tab */}
                {detail.hasVariants && (
                  <TabsContent
                    value="variants"
                    className="mt-0 px-6 py-4 space-y-4"
                  >
                    {/* Variant Summary */}
                    {detail.variantOptions &&
                      detail.variantOptions.length > 0 && (
                        <div className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {detail.variantOptions.map((opt, i) => (
                              <span key={opt._id}>
                                {i > 0 && " · "}
                                <span className="font-medium text-foreground">
                                  {opt.name}
                                </span>{" "}
                                ({opt.values.length} values)
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="tabular-nums">
                              <span className="text-muted-foreground">
                                Variants:
                              </span>{" "}
                              <span className="font-medium">
                                {detail.variants?.length ?? 0}
                              </span>
                            </span>
                            <span className="tabular-nums">
                              <span className="text-muted-foreground">
                                Total Stock:
                              </span>{" "}
                              <span className="font-medium">
                                {detail.variants?.reduce(
                                  (sum, v) => sum + v.stockQuantity,
                                  0,
                                ) ?? 0}
                              </span>
                            </span>
                          </div>
                        </div>
                      )}

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                        Variant Matrix
                      </p>
                      <VariantMatrixTable
                        productId={detail._id}
                        organizationId={organizationId}
                      />
                    </div>
                  </TabsContent>
                )}

                {/* Supplier Tab */}
                <TabsContent value="supplier" className="mt-0 px-6 py-4">
                  {detail.supplierInfo &&
                  (detail.supplierInfo.name ||
                    detail.supplierInfo.phone ||
                    detail.supplierInfo.email ||
                    detail.supplierInfo.notes) ? (
                    <div className="space-y-4">
                      {detail.supplierInfo.name && (
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <Truck className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Supplier
                            </p>
                            <p className="text-sm font-medium">
                              {detail.supplierInfo.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {detail.supplierInfo.phone && (
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <Phone className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Phone
                            </p>
                            <p className="text-sm font-medium">
                              {detail.supplierInfo.phone}
                            </p>
                          </div>
                        </div>
                      )}
                      {detail.supplierInfo.email && (
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <Mail className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Email
                            </p>
                            <p className="text-sm font-medium">
                              {detail.supplierInfo.email}
                            </p>
                          </div>
                        </div>
                      )}
                      {detail.supplierInfo.notes && (
                        <div>
                          <Separator className="my-2" />
                          <p className="text-xs text-muted-foreground mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {detail.supplierInfo.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-4 mb-3">
                        <Truck className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">
                        No supplier information
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add supplier details by editing this product
                      </p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <SheetHeader className="sr-only">
              <SheetTitle>Product Details</SheetTitle>
              <SheetDescription>Product not found</SheetDescription>
            </SheetHeader>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Product not found</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailSkeleton() {
  return (
    <div className="px-6 pt-5 space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="aspect-[16/10] w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
