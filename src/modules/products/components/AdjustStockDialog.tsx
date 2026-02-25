"use client";

import { useMutation } from "convex/react";
import { Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type AdjustStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
  productName: string;
  currentStock: number;
  organizationId: Id<"organization">;
};

type ReasonType = "restock" | "adjustment" | "waste";

export function AdjustStockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
  organizationId,
}: AdjustStockDialogProps) {
  const adjustStock = useMutation(api.products.adjustStock);
  const [newStock, setNewStock] = useState(currentStock);
  const [reason, setReason] = useState<ReasonType | "">("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync newStock when dialog opens or product changes
  useEffect(() => {
    if (open) {
      setNewStock(currentStock);
      setReason("");
      setNote("");
    }
  }, [open, currentStock]);

  const diff = newStock - currentStock;
  const hasChange = diff !== 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setNewStock(currentStock);
      setReason("");
      setNote("");
    }
    onOpenChange(nextOpen);
  }

  function handleStockChange(value: number) {
    setNewStock(Math.max(0, value));
  }

  async function handleSubmit() {
    if (!productId || !hasChange) return;

    setIsSubmitting(true);
    try {
      const type: ReasonType =
        reason || (diff > 0 ? "restock" : "adjustment");

      const resultStock = await adjustStock({
        organizationId,
        productId,
        type,
        quantity: diff,
        note: note.trim() || undefined,
      });
      handleOpenChange(false);
      toast.success(`Stock updated — new total: ${resultStock}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to adjust stock",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!productId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40 text-sm">
          <span className="font-medium truncate mr-2">{productName}</span>
          <Badge variant="outline">Stock: {currentStock}</Badge>
        </div>

        <div className="space-y-4 py-2">
          {/* +/- Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => handleStockChange(newStock - 1)}
              disabled={newStock <= 0}
            >
              <Minus className="size-4" />
            </Button>
            <Input
              type="number"
              min={0}
              value={newStock}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                handleStockChange(Number.isNaN(val) ? 0 : val);
              }}
              className="w-24 text-center text-lg font-semibold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => handleStockChange(newStock + 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Change summary */}
          {hasChange && (
            <p className="text-center text-sm">
              <span className="text-muted-foreground">{currentStock}</span>
              <span className="text-muted-foreground mx-1.5">&rarr;</span>
              <span className="font-medium">{newStock}</span>
              <span
                className={`ml-1.5 font-medium ${diff > 0 ? "text-green-600" : "text-destructive"}`}
              >
                ({diff > 0 ? "+" : ""}
                {diff})
              </span>
            </p>
          )}

          {/* Reason (optional) */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Reason{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ReasonType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="waste">Waste / Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note (optional) */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Note{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChange}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
