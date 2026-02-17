"use client";

import { useQuery } from "convex/react";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Category = {
  _id: Id<"productCategories">;
  name: string;
  status: "active" | "inactive";
  productCount: number;
};

import { AddCategoryDialog } from "./AddCategoryDialog";

type CategorySidebarProps = {
  organizationId: Id<"organization">;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
};

export function CategorySidebar({
  organizationId,
  selectedCategoryId,
  onSelectCategory,
}: CategorySidebarProps) {
  const categories = useQuery(api.productCategories.list, {
    organizationId,
  }) as Category[] | undefined;

  if (categories === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* All Products */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-colors",
          selectedCategoryId === null
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-2">
          <Tag className="size-3.5" />
          All Products
        </span>
        <Badge
          variant={selectedCategoryId === null ? "secondary" : "outline"}
          className="text-xs"
        >
          {categories.reduce((sum, c) => sum + c.productCount, 0)}
        </Badge>
      </button>

      {/* Active categories */}
      {categories
        .filter((c) => c.status === "active")
        .map((category) => (
          <button
            key={category._id}
            type="button"
            onClick={() => onSelectCategory(category._id)}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-colors",
              selectedCategoryId === category._id
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-muted",
            )}
          >
            <span className="truncate">{category.name}</span>
            <Badge
              variant={
                selectedCategoryId === category._id ? "secondary" : "outline"
              }
              className="text-xs shrink-0 ml-1"
            >
              {category.productCount}
            </Badge>
          </button>
        ))}

      {/* Divider + Add Category */}
      <div className="pt-2">
        <AddCategoryDialog
          organizationId={organizationId}
          onSuccess={(id) => onSelectCategory(id)}
        />
      </div>
    </div>
  );
}
