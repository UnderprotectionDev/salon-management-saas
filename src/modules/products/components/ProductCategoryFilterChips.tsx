"use client";

import { useQuery } from "convex/react";
import { Settings, Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ProductCategoryManageDialog } from "./ProductCategoryManageDialog";

type ProductCategoryFilterChipsProps = {
  organizationId: Id<"organization">;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isOwner: boolean;
};

type Category = {
  _id: Id<"productCategories">;
  name: string;
  status: "active" | "inactive";
  productCount: number;
};

export function ProductCategoryFilterChips({
  organizationId,
  selectedCategoryId,
  onSelectCategory,
  isOwner,
}: ProductCategoryFilterChipsProps) {
  const categories = useQuery(api.productCategories.list, {
    organizationId,
  }) as Category[] | undefined;
  const [manageOpen, setManageOpen] = useState(false);

  if (categories === undefined) {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  const activeCategories = categories.filter((c) => c.status === "active");
  const totalProductCount = activeCategories.reduce(
    (sum, c) => sum + c.productCount,
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
        <Tag className="size-3.5" />
        All Products
        <span className="text-xs opacity-70">({totalProductCount})</span>
      </button>

      {activeCategories.map((category) => (
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
          <span className="text-xs opacity-70">({category.productCount})</span>
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

          <ProductCategoryManageDialog
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
