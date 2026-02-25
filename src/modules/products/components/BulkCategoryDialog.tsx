"use client";

import { useMutation, useQuery } from "convex/react";
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

type BulkCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: Id<"products">[];
  organizationId: Id<"organization">;
  onSuccess: () => void;
};

export function BulkCategoryDialog({
  open,
  onOpenChange,
  productIds,
  organizationId,
  onSuccess,
}: BulkCategoryDialogProps) {
  const bulkUpdateCategory = useMutation(api.products.bulkUpdateCategory);
  const categories = useQuery(api.productCategories.list, { organizationId });
  const activeCategories =
    categories?.filter((c: { status: string }) => c.status === "active") ?? [];

  const [selectedCategoryId, setSelectedCategoryId] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedCategoryId("none");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const categoryId =
        selectedCategoryId !== "none"
          ? (selectedCategoryId as Id<"productCategories">)
          : undefined;

      const count = await bulkUpdateCategory({
        organizationId,
        productIds,
        categoryId,
      });
      toast.success(
        `Category updated for ${count} product${count !== 1 ? "s" : ""}`,
      );
      handleClose();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update category",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && handleClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>
            Change Category — {productIds.length} product
            {productIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-1.5">
          <Label id="bulk-category-label">Category</Label>
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
            disabled={categories === undefined}
          >
            <SelectTrigger aria-labelledby="bulk-category-label">
              <SelectValue placeholder={categories === undefined ? "Loading..." : "Select category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {activeCategories.map((cat: { _id: string; name: string }) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
