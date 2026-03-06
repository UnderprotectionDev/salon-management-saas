"use client";

import { useMutation } from "convex/react";
import { FolderEdit, PackageX, Percent, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { BulkCategoryDialog } from "./BulkCategoryDialog";
import { BulkPriceAdjustDialog } from "./BulkPriceAdjustDialog";

type BulkSelectionBarProps = {
  selectedIds: Id<"products">[];
  organizationId: Id<"organization">;
  onClearSelection: () => void;
};

export function BulkSelectionBar({
  selectedIds,
  organizationId,
  onClearSelection,
}: BulkSelectionBarProps) {
  const bulkUpdateStatus = useMutation(api.productBulk.bulkUpdateStatus);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const count = await bulkUpdateStatus({
        organizationId,
        productIds: selectedIds,
        status: "inactive",
      });
      toast.success(`${count} product${count !== 1 ? "s" : ""} deactivated`);
      onClearSelection();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate",
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {selectedIds.length}
          </span>
          selected
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoryDialogOpen(true)}
          >
            <FolderEdit className="mr-1.5 size-3.5" />
            Category
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPriceDialogOpen(true)}
          >
            <Percent className="mr-1.5 size-3.5" />
            Prices
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDeactivate}
            disabled={isDeactivating}
          >
            <PackageX className="mr-1.5 size-3.5" />
            Deactivate
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClearSelection}
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </Button>
      </div>

      <BulkPriceAdjustDialog
        open={priceDialogOpen}
        onOpenChange={setPriceDialogOpen}
        productIds={selectedIds}
        organizationId={organizationId}
        onSuccess={onClearSelection}
      />

      <BulkCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        productIds={selectedIds}
        organizationId={organizationId}
        onSuccess={onClearSelection}
      />
    </>
  );
}
