"use client";

import { useMutation } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type AddProductCategoryPopoverProps = {
  organizationId: Id<"organization">;
  onCreated?: (categoryId: Id<"productCategories">) => void;
};

export function AddProductCategoryPopover({
  organizationId,
  onCreated,
}: AddProductCategoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCategory = useMutation(api.productCategories.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const categoryId = await createCategory({
        organizationId,
        name: name.trim(),
      });
      setName("");
      setOpen(false);
      toast.success("Category created");
      onCreated?.(categoryId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create category";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
        >
          <Plus className="size-4" />
          <span className="sr-only">New Category</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="new-product-category-name">Category Name</Label>
            <Input
              id="new-product-category-name"
              placeholder="e.g. Hair Care"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
