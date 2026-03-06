"use client";

import { useQuery } from "convex/react";
import { LayoutGrid, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { CategoryManageDialog } from "./CategoryManageDialog";
import { CategoryFilterChipsSkeleton } from "./skeletons/CategoryFilterChipsSkeleton";

type CategoryFilterChipsProps = {
  organizationId: Id<"organization">;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isOwner: boolean;
};

export function CategoryFilterChips({
  organizationId,
  selectedCategoryId,
  onSelectCategory,
  isOwner,
}: CategoryFilterChipsProps) {
  const categories = useQuery(api.serviceCategories.list, { organizationId });
  const [manageOpen, setManageOpen] = useState(false);

  if (categories === undefined) {
    return <CategoryFilterChipsSkeleton />;
  }

  const totalServiceCount = categories.reduce(
    (sum, c) => sum + c.serviceCount,
    0,
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          selectedCategoryId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <LayoutGrid className="size-3.5" />
        All
        <span className="text-xs opacity-70">({totalServiceCount})</span>
      </button>

      {categories.map((category) => (
        <button
          key={category._id}
          type="button"
          onClick={() => onSelectCategory(category._id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedCategoryId === category._id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {category.name}
          <span className="text-xs opacity-70">({category.serviceCount})</span>
        </button>
      ))}

      {isOwner && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setManageOpen(true)}
          >
            <Settings className="size-4" />
            <span className="sr-only">Manage Categories</span>
          </Button>

          <CategoryManageDialog
            open={manageOpen}
            onOpenChange={setManageOpen}
            organizationId={organizationId}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        </>
      )}
    </div>
  );
}
