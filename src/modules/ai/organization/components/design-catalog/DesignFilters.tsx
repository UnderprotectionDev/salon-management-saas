"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DesignFiltersProps {
  slug: string;
  categories: string[];
  activeCategory: string;
  activeStatus: "all" | "active" | "inactive";
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: "all" | "active" | "inactive") => void;
  onSearchChange: (query: string) => void;
  totalCount: number;
}

export function DesignFilters({
  slug,
  categories,
  activeCategory,
  activeStatus,
  onCategoryChange,
  onStatusChange,
  onSearchChange,
  totalCount,
}: DesignFiltersProps) {
  const [searchValue, setSearchValue] = useState("");

  function handleSearchInput(value: string) {
    setSearchValue(value);
    onSearchChange(value);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: title + action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Design Catalog</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs tabular-nums">
            {totalCount}
          </span>
        </div>

        <Button asChild size="sm">
          <Link href={`/${slug}/ai/designs/new`}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Design
          </Link>
        </Button>
      </div>

      {/* Filter row: search + category pills + status toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search designs..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-1 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status toggle */}
        <div className="flex rounded-md border">
          {(["all", "active", "inactive"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors first:rounded-l-md last:rounded-r-md ${
                activeStatus === status
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
