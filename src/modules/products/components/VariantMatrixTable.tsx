"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, kurusToLiraString, liraToKurus } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { StockIndicatorBar } from "./StockIndicatorBar";

type VariantMatrixTableProps = {
  productId: Id<"products">;
  organizationId: Id<"organization">;
};

export function VariantMatrixTable({
  productId,
  organizationId,
}: VariantMatrixTableProps) {
  const variants = useQuery(api.productVariants.listByProduct, {
    organizationId,
    productId,
  });
  const updateVariant = useMutation(api.productVariants.update);
  const [editingCell, setEditingCell] = useState<{
    variantId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const committingRef = useRef(false);

  if (variants === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No variants generated yet
      </p>
    );
  }

  const startEdit = (
    variantId: string,
    field: string,
    currentValue: string,
  ) => {
    setEditingCell({ variantId, field });
    setEditValue(currentValue);
  };

  const commitEdit = async () => {
    if (!editingCell || committingRef.current) return;
    committingRef.current = true;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      const { field, variantId } = editingCell;

      if (field === "costPrice") {
        patch.costPrice = liraToKurus(editValue);
      } else if (field === "sellingPrice") {
        patch.sellingPrice = liraToKurus(editValue);
      } else if (field === "sku") {
        patch.sku = editValue.trim() || undefined;
      }

      await updateVariant({
        organizationId,
        variantId: variantId as Id<"productVariants">,
        ...patch,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update variant",
      );
    } finally {
      setSaving(false);
      setEditingCell(null);
      committingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Variant</TableHead>
            <TableHead className="w-[100px]">SKU</TableHead>
            <TableHead className="w-[100px] text-right">Cost</TableHead>
            <TableHead className="w-[100px] text-right">Price</TableHead>
            <TableHead className="w-[70px] text-right">Margin</TableHead>
            <TableHead className="w-[80px] text-right">Stock</TableHead>
            <TableHead className="w-[60px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((variant) => {
            const marginColor =
              variant.margin === undefined
                ? "text-muted-foreground"
                : variant.margin >= 30
                  ? "text-emerald-600"
                  : variant.margin >= 15
                    ? "text-amber-600"
                    : "text-destructive";

            return (
              <TableRow key={variant._id}>
                {/* Label with option names */}
                <TableCell className="font-medium">
                  <div className="flex flex-wrap gap-1">
                    {variant.optionValues.map((ov) => (
                      <Badge
                        key={`${ov.optionName}-${ov.value}`}
                        variant="outline"
                        className="text-xs"
                      >
                        <span className="text-muted-foreground">
                          {ov.optionName}:
                        </span>{" "}
                        {ov.value}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                {/* SKU */}
                <TableCell>
                  {editingCell?.variantId === variant._id &&
                  editingCell.field === "sku" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="h-7 text-xs"
                      disabled={saving}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer w-full text-left"
                      onClick={() =>
                        startEdit(variant._id, "sku", variant.sku ?? "")
                      }
                    >
                      {variant.sku || "—"}
                    </button>
                  )}
                </TableCell>

                {/* Cost */}
                <TableCell className="text-right">
                  {editingCell?.variantId === variant._id &&
                  editingCell.field === "costPrice" ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="h-7 text-xs text-right"
                      disabled={saving}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-xs tabular-nums hover:text-foreground cursor-pointer"
                      onClick={() =>
                        startEdit(
                          variant._id,
                          "costPrice",
                          kurusToLiraString(variant.costPrice),
                        )
                      }
                    >
                      {formatPrice(variant.costPrice)}
                    </button>
                  )}
                </TableCell>

                {/* Selling Price */}
                <TableCell className="text-right">
                  {editingCell?.variantId === variant._id &&
                  editingCell.field === "sellingPrice" ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="h-7 text-xs text-right"
                      disabled={saving}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-medium tabular-nums hover:text-foreground cursor-pointer"
                      onClick={() =>
                        startEdit(
                          variant._id,
                          "sellingPrice",
                          kurusToLiraString(variant.sellingPrice),
                        )
                      }
                    >
                      {formatPrice(variant.sellingPrice)}
                    </button>
                  )}
                </TableCell>

                {/* Margin */}
                <TableCell className="text-right">
                  <span className={`text-xs tabular-nums ${marginColor}`}>
                    {variant.margin !== undefined ? `${variant.margin}%` : "—"}
                  </span>
                </TableCell>

                {/* Stock */}
                <TableCell className="text-right">
                  <div className="space-y-1">
                    <span className="text-xs tabular-nums font-medium">
                      {variant.stockQuantity}
                    </span>
                    <StockIndicatorBar
                      stockQuantity={variant.stockQuantity}
                      className="w-12 ml-auto"
                    />
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={
                      variant.status === "active" ? "default" : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {variant.status === "active" ? "On" : "Off"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
