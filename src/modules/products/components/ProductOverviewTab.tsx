import { AlertTriangle, Package } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PriceHistoryTimeline } from "./PriceHistoryTimeline";
import type { ProductDetail } from "./ProductDetailTypes";
import { StockIndicatorBar } from "./StockIndicatorBar";

export function ProductOverviewTab({
  detail,
  organizationId,
}: {
  detail: ProductDetail;
  organizationId: Id<"organization">;
}) {
  return (
    <div className="space-y-5">
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
    </div>
  );
}
