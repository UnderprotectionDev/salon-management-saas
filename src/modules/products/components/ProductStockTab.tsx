import { History, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ProductDetail } from "./ProductDetailTypes";
import { StockIndicatorBar } from "./StockIndicatorBar";

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

export function ProductStockTab({
  detail,
  onAdjustStock,
  onViewFullHistory,
  onOpenChange,
}: {
  detail: ProductDetail;
  onAdjustStock: (
    productId: Id<"products">,
    name: string,
    stock: number,
  ) => void;
  onViewFullHistory: (productId: Id<"products">, name: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Current stock hero */}
      <div className="text-center py-3">
        <span className="text-4xl font-light tabular-nums">
          {detail.stockQuantity}
        </span>
        <p className="text-xs text-muted-foreground mt-1">units in stock</p>
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
            onAdjustStock(detail._id, detail.name, detail.stockQuantity);
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
              const isLast = index === detail.recentTransactions.length - 1;

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
    </div>
  );
}
