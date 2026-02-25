"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
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

type VariantStockAdjustDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
  productName: string;
  organizationId: Id<"organization">;
};

type ReasonType = "restock" | "adjustment" | "waste";

export function VariantStockAdjustDialog({
  open,
  onOpenChange,
  productId,
  productName,
  organizationId,
}: VariantStockAdjustDialogProps) {
  const variants = useQuery(
    api.productVariants.listByProduct,
    productId ? { organizationId, productId } : "skip",
  );
  const adjustStock = useMutation(api.productVariants.adjustStock);

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [newStock, setNewStock] = useState(0);
  const [reason, setReason] = useState<ReasonType>("restock");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVariant = variants?.find((v) => v._id === selectedVariantId);
  const currentStock = selectedVariant?.stockQuantity ?? 0;
  const diff = newStock - currentStock;
  const hasChange = diff !== 0;

  useEffect(() => {
    if (open && variants && variants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(variants[0]._id);
      setNewStock(variants[0].stockQuantity);
    }
  }, [open, variants, selectedVariantId]);

  useEffect(() => {
    if (selectedVariant) {
      setNewStock(selectedVariant.stockQuantity);
      setReason("restock");
      setNote("");
    }
  }, [selectedVariant]);

  function handleClose() {
    setSelectedVariantId("");
    setNewStock(0);
    setReason("restock");
    setNote("");
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!selectedVariantId || !hasChange) return;

    // Warn if reason doesn't match direction
    if (reason === "restock" && diff < 0) {
      toast.error("Restock should increase stock. Use 'Report Damage' or 'Count Correction' instead.");
      return;
    }
    if (reason === "waste" && diff > 0) {
      toast.error("Report Damage should decrease stock. Use 'Restock Inventory' instead.");
      return;
    }

    setIsSubmitting(true);
    try {
      const resultStock = await adjustStock({
        organizationId,
        variantId: selectedVariantId as Id<"productVariants">,
        type: reason,
        quantity: diff,
        note: note.trim() || undefined,
      });
      toast.success(`Variant stock updated — new total: ${resultStock}`);
      handleClose();
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
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Adjust Variant Stock — {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Variant Selector */}
          <div className="space-y-1.5">
            <Label>Select Variant</Label>
            {variants === undefined ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading variants...
              </div>
            ) : (
              {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No variants found for this product.
                </p>
              ) : (
                <Select
                  value={selectedVariantId}
                  onValueChange={(val) => setSelectedVariantId(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        <div className="flex items-center gap-2">
                          <span>{v.label}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {v.stockQuantity} in stock
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            )}
          </div>

          {selectedVariant && (
            <>
              {/* New Stock */}
              <div className="space-y-1.5">
                <Label>New Stock Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => setNewStock(Math.max(0, newStock - 1))}
                    disabled={newStock <= 0}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={newStock}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      setNewStock(Number.isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="text-center font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => setNewStock(newStock + 1)}
                  >
                    +
                  </Button>
                </div>
                {hasChange && (
                  <p className="text-xs text-muted-foreground text-center">
                    {currentStock} → {newStock}{" "}
                    <span
                      className={
                        diff > 0 ? "text-emerald-600" : "text-destructive"
                      }
                    >
                      ({diff > 0 ? "+" : ""}
                      {diff})
                    </span>
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select
                  value={reason}
                  onValueChange={(val) => setReason(val as ReasonType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock Inventory</SelectItem>
                    <SelectItem value="waste">Report Damage</SelectItem>
                    <SelectItem value="adjustment">Count Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 140))}
                  placeholder="Add details..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChange || !selectedVariantId}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
