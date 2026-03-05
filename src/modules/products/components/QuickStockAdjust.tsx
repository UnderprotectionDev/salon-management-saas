"use client";

import { useMutation } from "convex/react";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type QuickStockAdjustProps = {
  productId: Id<"products">;
  productName: string;
  currentStock: number;
  organizationId: Id<"organization">;
  onOpenFullAdjust: () => void;
};

export function QuickStockAdjust({
  productId,
  productName,
  currentStock,
  organizationId,
  onOpenFullAdjust,
}: QuickStockAdjustProps) {
  const adjustStock = useMutation(api.products.adjustStock);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleAdjust = async (quantity: number) => {
    setIsAdjusting(true);
    try {
      await adjustStock({
        organizationId,
        productId,
        type: "adjustment",
        quantity,
        note: `Quick adjust ${quantity > 0 ? "+" : ""}${quantity}`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to adjust stock for ${productName}`,
      );
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-6"
        onClick={(e) => {
          e.stopPropagation();
          handleAdjust(-1);
        }}
        disabled={isAdjusting || currentStock <= 0}
      >
        <Minus className="size-3" />
      </Button>
      <button
        type="button"
        className="min-w-[2.5rem] text-center text-sm font-medium tabular-nums hover:underline cursor-pointer bg-transparent border-0 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onOpenFullAdjust();
        }}
        title="Click to adjust stock"
      >
        {currentStock}
      </button>
      <Button
        variant="outline"
        size="icon"
        className="size-6"
        onClick={(e) => {
          e.stopPropagation();
          handleAdjust(1);
        }}
        disabled={isAdjusting}
      >
        <Plus className="size-3" />
      </Button>
    </div>
  );
}
