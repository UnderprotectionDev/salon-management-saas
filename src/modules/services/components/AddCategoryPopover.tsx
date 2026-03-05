"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getConvexErrorMessage } from "@/lib/convex-error";
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
  onCreated?: (categoryId: Id<"serviceCategories">) => void;
  variant?: "sidebar" | "inline";
};

export function AddCategoryPopover({
  organizationId,
  onCreated,
  variant = "sidebar",
}: AddCategoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCategory = useMutation(api.serviceCategories.create);
  const categories = useQuery(api.serviceCategories.list, { organizationId });

  const handleSubmit = async () => {
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
      if (
        error instanceof ConvexError &&
        (error.data as { code?: string })?.code === "ALREADY_EXISTS"
      ) {
        // Category already exists — auto-select it instead of showing an error
        const existing = categories?.find(
          (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
        );
        if (existing) {
          setName("");
          setOpen(false);
          toast.info(
            `"${existing.name}" already exists — selected automatically`,
          );
          onCreated?.(existing._id);
          return;
        }
      }
      toast.error(
        getConvexErrorMessage(error, "Failed to create category"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setName("");
      }}
    >
      <PopoverTrigger asChild>
        {variant === "inline" ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
          >
            <Plus className="size-4" />
            <span className="sr-only">New Category</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Plus className="mr-2 size-4" />
            Add Category
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="e.g. Hair Care"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!name.trim() || isSubmitting}
            onClick={handleSubmit}
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
