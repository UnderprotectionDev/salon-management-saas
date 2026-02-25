"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

const MAX_NOTE_LENGTH = 140;

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
  const [reason, setReason] = useState<ReasonType>("restock");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNewStock(currentStock);
      setReason("restock");
      setNote("");
    }
  }, [open, currentStock]);

  const diff = newStock - currentStock;
  const hasChange = diff !== 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setNewStock(currentStock);
      setReason("restock");
      setNote("");
    }
    onOpenChange(nextOpen);
  }

  function handleStockChange(value: number) {
    setNewStock(Math.max(0, value));
  }

  async function handleSubmit() {
    if (!productId || !hasChange) return;

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
      const type: ReasonType = reason || (diff > 0 ? "restock" : "adjustment");

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
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[420px] gap-0 overflow-hidden border-2 border-foreground p-0 bg-[image:linear-gradient(var(--muted)_1px,transparent_1px),linear-gradient(90deg,var(--muted)_1px,transparent_1px)] bg-[size:20px_20px]"
      >
        {/* Accessible title (visually hidden since we have a custom header) */}
        <DialogTitle className="sr-only">
          Adjust Stock — {productName}
        </DialogTitle>

        {/* Header: product name + stock badge */}
        <header className="grid grid-cols-[1fr_auto] items-start gap-4 border-b-2 border-foreground px-5 pt-4 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1px] opacity-70">
              Selected Item
            </span>
            <h2 className="mt-1 text-[28px] font-bold uppercase leading-none tracking-[3px]">
              {productName}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 border border-foreground px-2 py-1 text-xs font-bold uppercase shadow-[2px_2px_0_var(--foreground)]">
            <span className="border-r border-foreground pr-1.5 font-mono text-[8px] opacity-80">
              FIG.{String(currentStock).padStart(3, "0")}
            </span>
            <span>Stock: {currentStock}</span>
          </div>
        </header>

        {/* Form rows */}
        <div>
          {/* Quantity stepper */}
          <div className="grid grid-cols-[100px_1fr] border-b border-foreground">
            <div className="flex items-center border-r border-foreground bg-foreground/[0.03] px-5 text-xs font-bold uppercase tracking-[0.5px]">
              Adjust Qty
            </div>
            <div className="flex items-stretch">
              <button
                type="button"
                className="flex w-12 items-center justify-center text-xl font-bold transition-colors hover:bg-foreground/5 active:bg-foreground active:text-background"
                onClick={() => handleStockChange(newStock - 1)}
                disabled={newStock <= 0}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={newStock}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  handleStockChange(Number.isNaN(val) ? 0 : val);
                }}
                aria-label="Stock quantity"
                className="flex-1 border-x border-foreground bg-transparent py-4 text-center font-mono text-lg font-bold outline-none [-moz-appearance:textfield] focus:bg-[oklch(0.95_0.05_95)] [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0"
              />
              <button
                type="button"
                className="flex w-12 items-center justify-center text-xl font-bold transition-colors hover:bg-foreground/5 active:bg-foreground active:text-background"
                onClick={() => handleStockChange(newStock + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Reason select */}
          <div className="grid grid-cols-[100px_1fr] border-b border-foreground">
            <div className="flex items-center border-r border-foreground bg-foreground/[0.03] px-5 text-xs font-bold uppercase tracking-[0.5px]">
              Reason
            </div>
            <div className="relative flex items-stretch">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReasonType)}
                className="w-full appearance-none bg-transparent px-5 py-4 text-base font-medium uppercase outline-none focus:bg-[oklch(0.95_0.05_95)]"
              >
                <option value="restock">Restock Inventory</option>
                <option value="waste">Report Damage</option>
                <option value="adjustment">Count Correction</option>
              </select>
              <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-foreground" />
            </div>
          </div>

          {/* Note textarea */}
          <div className="border-b border-foreground">
            <div className="flex items-center border-b border-foreground px-5 py-2.5">
              <span className="text-xs font-bold uppercase tracking-[0.5px]">
                Optional Note
              </span>
              <span className="ml-auto font-mono text-[10px] opacity-50">
                MAX {MAX_NOTE_LENGTH}
              </span>
            </div>
            <textarea
              id="adjust-stock-note"
              aria-label="Optional note"
              value={note}
              onChange={(e) => {
                if (e.target.value.length <= MAX_NOTE_LENGTH) {
                  setNote(e.target.value);
                }
              }}
              placeholder="Enter details here..."
              rows={3}
              className="w-full resize-y bg-transparent px-5 py-3 font-mono text-sm leading-relaxed outline-none focus:bg-[oklch(0.95_0.05_95)] bg-[image:linear-gradient(transparent_95%,var(--muted)_95%)] bg-[size:100%_24px] bg-[attachment:local]"
            />
          </div>
        </div>

        {/* Change summary (subtle) */}
        {hasChange && (
          <div className="border-b border-foreground px-5 py-2 text-center font-mono text-xs">
            <span className="opacity-60">{currentStock}</span>
            <span className="mx-2 opacity-40">&rarr;</span>
            <span className="font-bold">{newStock}</span>
            <span
              className={`ml-2 font-bold ${diff > 0 ? "text-success" : "text-destructive"}`}
            >
              ({diff > 0 ? "+" : ""}
              {diff})
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-[1fr_1.5fr] border-t-2 border-foreground">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="border-r border-foreground px-5 py-5 text-sm font-bold uppercase tracking-[1px] transition-colors hover:bg-foreground/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChange}
            className="relative overflow-hidden bg-foreground px-5 py-5 text-sm font-bold uppercase tracking-[1px] text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Updating...
              </span>
            ) : (
              "Update Stock"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
