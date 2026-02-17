"use client";

import { useQuery } from "convex/react";
import { ArrowDown, ArrowUp, History, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
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
};

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

const typeLabels: Record<string, string> = {
  restock: "Restock",
  adjustment: "Adjustment",
  waste: "Waste",
};

const typeBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  restock: "default",
  adjustment: "secondary",
  waste: "destructive",
};

export function InventoryHistorySheet({
  open,
  onOpenChange,
  productId,
  productName,
  organizationId,
}: InventoryHistorySheetProps) {
  const transactions = useQuery(
    api.inventoryTransactions.listByProduct,
    productId ? { organizationId, productId, limit: 100 } : "skip",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4" />
            Inventory History
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {transactions === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No inventory transactions yet
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {transactions.map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  {/* Direction icon */}
                  <div
                    className={
                      tx.quantity > 0
                        ? "text-green-600 shrink-0 mt-0.5"
                        : tx.quantity < 0
                          ? "text-destructive shrink-0 mt-0.5"
                          : "text-muted-foreground shrink-0 mt-0.5"
                    }
                  >
                    {tx.quantity > 0 ? (
                      <ArrowUp className="size-4" />
                    ) : tx.quantity < 0 ? (
                      <ArrowDown className="size-4" />
                    ) : (
                      <Minus className="size-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={typeBadgeVariant[tx.type] ?? "outline"}
                        className="text-xs"
                      >
                        {typeLabels[tx.type] ?? tx.type}
                      </Badge>
                      <span
                        className={
                          tx.quantity > 0
                            ? "text-sm font-medium text-green-600"
                            : tx.quantity < 0
                              ? "text-sm font-medium text-destructive"
                              : "text-sm font-medium text-muted-foreground"
                        }
                      >
                        {tx.quantity > 0 ? "+" : ""}
                        {tx.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tx.previousStock} → {tx.newStock}
                      </span>
                    </div>
                    {tx.note && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {tx.note}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </p>
                      {tx.staffName && (
                        <span className="text-xs text-muted-foreground">
                          · {tx.staffName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
