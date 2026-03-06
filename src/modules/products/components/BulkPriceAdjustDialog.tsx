"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type BulkPriceAdjustDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: Id<"products">[];
  organizationId: Id<"organization">;
  onSuccess: () => void;
};

export function BulkPriceAdjustDialog({
  open,
  onOpenChange,
  productIds,
  organizationId,
  onSuccess,
}: BulkPriceAdjustDialogProps) {
  const bulkAdjustPrices = useMutation(api.productBulk.bulkAdjustPrices);
  const [adjustmentType, setAdjustmentType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [priceField, setPriceField] = useState<"costPrice" | "sellingPrice">(
    "sellingPrice",
  );
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setAdjustmentType("percentage");
    setPriceField("sellingPrice");
    setAmount("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const numAmount = Number.parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount === 0) return;

    setIsSubmitting(true);
    try {
      const finalAmount =
        adjustmentType === "fixed" ? Math.round(numAmount * 100) : numAmount;

      const count = await bulkAdjustPrices({
        organizationId,
        productIds,
        adjustmentType,
        priceField,
        amount: finalAmount,
      });
      toast.success(
        `Prices updated for ${count} product${count !== 1 ? "s" : ""}`,
      );
      handleClose();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to adjust prices",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !isSubmitting && handleClose()}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            Adjust Prices — {productIds.length} product
            {productIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Price Field</Label>
            <Select
              value={priceField}
              onValueChange={(v) =>
                setPriceField(v as "costPrice" | "sellingPrice")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sellingPrice">Selling Price</SelectItem>
                <SelectItem value="costPrice">Cost Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Adjustment Type</Label>
            <Select
              value={adjustmentType}
              onValueChange={(v) =>
                setAdjustmentType(v as "percentage" | "fixed")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (₺)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Amount{" "}
              <span className="text-muted-foreground font-normal">
                (
                {adjustmentType === "percentage"
                  ? "use negative to decrease"
                  : "₺, use negative to decrease"}
                )
              </span>
            </Label>
            <Input
              type="number"
              step={adjustmentType === "percentage" ? "1" : "0.01"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={
                adjustmentType === "percentage" ? "e.g. 10" : "e.g. 5.00"
              }
            />
            {amount && !Number.isNaN(Number.parseFloat(amount)) && (
              <p className="text-xs text-muted-foreground">
                {Number.parseFloat(amount) > 0 ? "Increase" : "Decrease"}{" "}
                {priceField === "sellingPrice" ? "selling" : "cost"} price by{" "}
                {Math.abs(Number.parseFloat(amount))}
                {adjustmentType === "percentage" ? "%" : " ₺"}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              productIds.length === 0 ||
              !amount ||
              Number.isNaN(Number.parseFloat(amount)) ||
              Number.parseFloat(amount) === 0
            }
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
