"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type SortOption =
  | "default"
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "stock_asc"
  | "newest";

export type ProductFilters = {
  search: string;
  status: "all" | "active" | "inactive";
  stockLevel: StockFilter;
  sort: SortOption;
  priceMin?: number;
  priceMax?: number;
  marginMin?: number;
  marginMax?: number;
  createdAfter?: string;
  createdBefore?: string;
};

type ProductFiltersProps = {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
};

function countAdvancedFilters(filters: ProductFilters): number {
  let count = 0;
  if (filters.priceMin !== undefined) count++;
  if (filters.priceMax !== undefined) count++;
  if (filters.marginMin !== undefined) count++;
  if (filters.marginMax !== undefined) count++;
  if (filters.createdAfter) count++;
  if (filters.createdBefore) count++;
  return count;
}

export function ProductFiltersBar({
  filters,
  onFiltersChange,
}: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // Sync external filter changes (e.g. from stats bar click)
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const advancedCount = countAdvancedFilters(filters);
  const hasAnyFilter =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.stockLevel !== "all" ||
    filters.sort !== "default" ||
    advancedCount > 0;

  const clearAllFilters = () => {
    setSearchInput("");
    onFiltersChange({
      search: "",
      status: "all",
      stockLevel: "all",
      sort: "default",
    });
    setAdvancedOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              status: v as ProductFilters["status"],
            })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Stock Level */}
        <Select
          value={filters.stockLevel}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              stockLevel: v as StockFilter,
            })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sort}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, sort: v as SortOption })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Order</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
            <SelectItem value="price_asc">Price Low-High</SelectItem>
            <SelectItem value="price_desc">Price High-Low</SelectItem>
            <SelectItem value="stock_asc">Stock Low-High</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>

        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="shrink-0"
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ChevronDown
              className={`size-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
            />
            Advanced Filters
            {advancedCount > 0 && (
              <Badge variant="secondary" className="size-5 p-0 justify-center">
                {advancedCount}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border p-3">
            {/* Price range */}
            <div className="space-y-1">
              <label
                htmlFor="filter-price-min"
                className="text-xs font-medium text-muted-foreground"
              >
                Price Min (TL)
              </label>
              <Input
                id="filter-price-min"
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                value={
                  filters.priceMin !== undefined
                    ? (filters.priceMin / 100).toString()
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange({
                    ...filters,
                    priceMin: val ? Math.round(Number(val) * 100) : undefined,
                  });
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-price-max"
                className="text-xs font-medium text-muted-foreground"
              >
                Price Max (TL)
              </label>
              <Input
                id="filter-price-max"
                type="number"
                min={0}
                step={0.01}
                placeholder="No limit"
                value={
                  filters.priceMax !== undefined
                    ? (filters.priceMax / 100).toString()
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange({
                    ...filters,
                    priceMax: val ? Math.round(Number(val) * 100) : undefined,
                  });
                }}
                className="h-8 text-sm"
              />
            </div>

            {/* Margin range */}
            <div className="space-y-1">
              <label
                htmlFor="filter-margin-min"
                className="text-xs font-medium text-muted-foreground"
              >
                Margin Min (%)
              </label>
              <Input
                id="filter-margin-min"
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={filters.marginMin?.toString() ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange({
                    ...filters,
                    marginMin: val ? Number(val) : undefined,
                  });
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-margin-max"
                className="text-xs font-medium text-muted-foreground"
              >
                Margin Max (%)
              </label>
              <Input
                id="filter-margin-max"
                type="number"
                min={0}
                max={100}
                placeholder="No limit"
                value={filters.marginMax?.toString() ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange({
                    ...filters,
                    marginMax: val ? Number(val) : undefined,
                  });
                }}
                className="h-8 text-sm"
              />
            </div>

            {/* Date range */}
            <div className="space-y-1">
              <label
                htmlFor="filter-created-after"
                className="text-xs font-medium text-muted-foreground"
              >
                Created After
              </label>
              <Input
                id="filter-created-after"
                type="date"
                value={filters.createdAfter ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    createdAfter: e.target.value || undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-created-before"
                className="text-xs font-medium text-muted-foreground"
              >
                Created Before
              </label>
              <Input
                id="filter-created-before"
                type="date"
                value={filters.createdBefore ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    createdBefore: e.target.value || undefined,
                  })
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
