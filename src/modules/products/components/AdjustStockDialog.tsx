"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { Loader2, Minus, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

const quantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .refine((n) => n !== 0, "Quantity cannot be zero");

type AdjustStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: Id<"products"> | null;
  productName: string;
  currentStock: number;
  organizationId: Id<"organization">;
};

type TransactionType = "restock" | "adjustment" | "waste";

const typeLabels: Record<TransactionType, string> = {
  restock: "Restock",
  adjustment: "Manual Adjustment",
  waste: "Waste / Loss",
};

const typeDescriptions: Record<TransactionType, string> = {
  restock: "Add stock received from supplier",
  adjustment: "Correct stock count (positive or negative)",
  waste: "Remove damaged or expired stock",
};

export function AdjustStockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
  organizationId,
}: AdjustStockDialogProps) {
  const adjustStock = useMutation(api.products.adjustStock);

  const form = useForm({
    defaultValues: {
      type: "restock" as TransactionType,
      quantity: "",
      note: "",
    },
    onSubmit: async ({ value }) => {
      if (!productId) return;
      try {
        const rawQuantity = parseInt(value.quantity, 10);
        if (Number.isNaN(rawQuantity) || rawQuantity === 0) {
          toast.error("Please enter a valid non-zero quantity");
          return;
        }
        // restock: always positive; waste: always negative; adjustment: signed as-entered
        const signed =
          value.type === "restock"
            ? Math.abs(rawQuantity)
            : value.type === "waste"
              ? -Math.abs(rawQuantity)
              : rawQuantity;

        const newStock = await adjustStock({
          organizationId,
          productId,
          type: value.type,
          quantity: signed,
          note: value.note.trim() || undefined,
        });
        onOpenChange(false);
        form.reset();
        toast.success(`Stock updated — new total: ${newStock}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to adjust stock",
        );
      }
    },
  });

  if (!productId) return null;

  const quantityValue = parseInt(form.state.values.quantity || "0", 10) || 0;
  const type = form.state.values.type;
  const effectiveChange =
    type === "waste" ? -Math.abs(quantityValue) : quantityValue;
  const projectedStock = currentStock + effectiveChange;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40 text-sm">
          <span className="font-medium truncate mr-2">{productName}</span>
          <Badge variant="outline">Stock: {currentStock}</Badge>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="py-4">
            <form.Field name="type">
              {(field) => (
                <Field>
                  <FieldLabel>Transaction Type</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as TransactionType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeLabels) as TransactionType[]).map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            <div>
                              <p className="font-medium">{typeLabels[t]}</p>
                              <p className="text-xs text-muted-foreground">
                                {typeDescriptions[t]}
                              </p>
                            </div>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="quantity"
              validators={{
                onBlur: ({ value }) => {
                  const r = quantitySchema.safeParse(parseInt(value, 10) || 0);
                  return r.success ? undefined : r.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>
                    Quantity{" "}
                    {type === "adjustment" ? (
                      <span className="text-muted-foreground font-normal text-xs">
                        (use negative to decrease)
                      </span>
                    ) : null}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    step="1"
                    min={type === "adjustment" ? undefined : "1"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={type === "adjustment" ? "-5 or +10" : "0"}
                  />
                  <FieldError
                    errors={field.state.meta.errors.map((e) => ({
                      message: String(e),
                    }))}
                  />
                </Field>
              )}
            </form.Field>

            {/* Projected stock preview */}
            {quantityValue !== 0 && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Projected stock after adjustment
                </span>
                <span
                  className={
                    projectedStock < 0
                      ? "text-destructive font-medium"
                      : "font-medium"
                  }
                >
                  {effectiveChange > 0 ? (
                    <Plus className="inline size-3 mr-0.5 text-green-600" />
                  ) : (
                    <Minus className="inline size-3 mr-0.5 text-destructive" />
                  )}
                  {projectedStock}
                </span>
              </div>
            )}

            {projectedStock < 0 && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <TriangleAlert className="size-4 shrink-0" />
                <span>Stock cannot go below zero</span>
              </div>
            )}

            <form.Field name="note">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Note{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={2}
                    placeholder="Reason for adjustment..."
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting || projectedStock < 0}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Apply
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
