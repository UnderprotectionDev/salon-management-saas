"use client";

import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUSES,
  SOURCE_LABELS,
  SOURCES,
} from "../lib/constants";

type Filters = {
  accountStatus?: string;
  source?: string;
  totalVisitsMin?: number;
  totalVisitsMax?: number;
  totalSpentMin?: number;
  totalSpentMax?: number;
  tags?: string;
};

type CustomerSearchProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function CustomerSearch({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
}: CustomerSearchProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "",
  ).length;

  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            onClick={() => onSearchChange("")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="size-5 p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Advanced Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-auto p-0 text-xs text-muted-foreground"
                >
                  Reset all
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Account Status</Label>
              <Select
                value={filters.accountStatus || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    accountStatus: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ACCOUNT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {ACCOUNT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Source</Label>
              <Select
                value={filters.source || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    source: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Total Visits</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={filters.totalVisitsMin ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      totalVisitsMin: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={filters.totalVisitsMax ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      totalVisitsMax: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Total Spent (TL)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={
                    filters.totalSpentMin !== undefined
                      ? filters.totalSpentMin / 100
                      : ""
                  }
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      totalSpentMin: e.target.value
                        ? Number(e.target.value) * 100
                        : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={
                    filters.totalSpentMax !== undefined
                      ? filters.totalSpentMax / 100
                      : ""
                  }
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      totalSpentMax: e.target.value
                        ? Number(e.target.value) * 100
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                placeholder="VIP, Regular"
                value={filters.tags ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    tags: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
