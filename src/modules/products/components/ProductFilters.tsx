"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProductFilters as Filters,
  SortOption,
  StockFilter,
} from "./ProductGrid";

type ProductFiltersProps = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function ProductFiltersBar({
  filters,
  onFiltersChange,
}: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

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

  return (
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
            status: v as Filters["status"],
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
          <SelectItem value="name_asc">Name A-Z</SelectItem>
          <SelectItem value="name_desc">Name Z-A</SelectItem>
          <SelectItem value="price_asc">Price Low-High</SelectItem>
          <SelectItem value="price_desc">Price High-Low</SelectItem>
          <SelectItem value="stock_asc">Stock Low-High</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
