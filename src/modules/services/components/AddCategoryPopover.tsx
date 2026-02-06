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

type AddCategoryPopoverProps = {
  organizationId: Id<"organization">;
};

export function AddCategoryPopover({
  organizationId,
}: AddCategoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCategory = useMutation(api.serviceCategories.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCategory({ organizationId, name: name.trim() });
      setName("");
      setOpen(false);
      toast.success("Category created");
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
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Plus className="mr-2 size-4" />
          Add Category
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
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
