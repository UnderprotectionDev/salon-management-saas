"use client";

import { useQuery } from "convex/react";
import { History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type InventoryHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
  productName: string;
  organizationId: Id<"organization">;
  currentStock?: number;
};

function formatDate(timestamp: number): { line1: string; line2: string } {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    const hours = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return { line1: hours, line2: "" };
  }

  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate().toString();
  return { line1: month, line2: day };
}

const typeConfig: Record<string, { label: string; tag: string }> = {
  restock: { label: "Restock", tag: "IN" },
  adjustment: { label: "Adjustment", tag: "ADJ" },
  waste: { label: "Waste", tag: "DMG" },
  return: { label: "Return", tag: "RTN" },
};

const defaultType = { label: "Other", tag: "OTH" };

export function InventoryHistorySheet({
  open,
  onOpenChange,
  productId,
  productName,
  organizationId,
  currentStock: currentStockProp,
}: InventoryHistorySheetProps) {
  const transactions = useQuery(
    api.inventoryTransactions.listByProduct,
    productId ? { organizationId, productId, limit: 100 } : "skip",
  );

  const currentStock =
    currentStockProp ??
    (transactions && transactions.length > 0 ? transactions[0].newStock : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-8 pt-6 pb-0">
          <SheetTitle className="flex items-center gap-2 text-xs font-normal text-muted-foreground uppercase tracking-widest">
            <History className="size-3.5" />
            Inventory History
          </SheetTitle>
        </SheetHeader>

        {/* Product name + stock hero */}
        <div className="px-8 pt-5 pb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
            {productName}
          </h2>
          {currentStock !== null && (
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-5xl font-light tabular-nums text-foreground leading-none">
                {currentStock}
              </span>
              <span className="text-sm text-muted-foreground">in stock</span>
            </div>
          )}
          {/* Brand accent separator */}
          <div className="mt-6 h-[2px] bg-brand" />
        </div>

        {/* Section label */}
        {transactions && transactions.length > 0 && (
          <div className="px-8 pb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Stock History
            </p>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="px-8 pb-8">
            {transactions === undefined ? (
              <div className="space-y-6 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[3.5rem_1fr_auto] gap-x-5"
                  >
                    <Skeleton className="h-4 w-10" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <History className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Stock changes will appear here
                </p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, index) => {
                  const config = typeConfig[tx.type] ?? defaultType;
                  const isWaste = tx.type === "waste";
                  const { line1, line2 } = formatDate(tx.createdAt);
                  const isLast = index === transactions.length - 1;

                  const isIncrease = tx.quantity > 0;

                  return (
                    <div
                      key={tx._id}
                      className={`flex ${!isLast ? "border-b border-border/60" : ""}`}
                    >
                      {/* Left color bar */}
                      <div
                        className={`w-[3px] shrink-0 rounded-full my-3 ${
                          isIncrease ? "bg-success" : "bg-destructive"
                        }`}
                      />

                      {/* Row content */}
                      <div className="grid grid-cols-[3.5rem_1fr_auto] gap-x-5 py-5 pl-4 flex-1 min-w-0">
                        {/* Left: compact date */}
                        <div className="text-xs text-muted-foreground tabular-nums leading-snug pt-1">
                          <div>{line1}</div>
                          {line2 && (
                            <div className="text-muted-foreground/70">
                              {line2}
                            </div>
                          )}
                        </div>

                        {/* Center: event type (editorial italic) + meta */}
                        <div className="min-w-0">
                          <p className="flex items-baseline gap-1">
                            <span
                              className={`text-lg italic ${
                                isWaste
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {config.label}
                            </span>
                            <sup className="text-[9px] text-muted-foreground/60 tracking-wide">
                              ({config.tag})
                            </sup>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {tx.staffName && <span>by {tx.staffName}</span>}
                            {tx.staffName && tx.note && <span> — </span>}
                            {tx.note && <span>{tx.note}</span>}
                            {!tx.staffName && !tx.note && (
                              <span className="text-muted-foreground/50">
                                No details
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Right: stock transition */}
                        <div className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground text-right pt-1">
                          {tx.previousStock} → {tx.newStock}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Editorial footer */}
        {transactions && transactions.length > 0 && (
          <SheetFooter className="px-8 py-4 border-t border-border/40">
            <div className="flex items-center justify-between w-full">
              <div className="size-2 rounded-full bg-brand" />
              <p className="text-xs italic text-muted-foreground">
                {transactions.length} transaction
                {transactions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
