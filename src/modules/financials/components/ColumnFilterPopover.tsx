"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CellMap } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";

interface ColumnFilterPopoverProps {
  col: number;
  cells: CellMap;
  rowCount: number;
  activeFilter: Set<string> | undefined;
  onFilterChange: (col: number, values: Set<string> | null) => void;
}

export function ColumnFilterPopover({
  col,
  cells,
  rowCount,
  activeFilter,
  onFilterChange,
}: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Collect unique values from this column (skip header row 0)
  const uniqueValues: string[] = [];
  const seen = new Set<string>();
  for (let r = 1; r < rowCount; r++) {
    const val = cells[cellRef(r, col)]?.value ?? "";
    if (!seen.has(val)) {
      seen.add(val);
      uniqueValues.push(val);
    }
  }
  uniqueValues.sort();

  const filteredValues = search
    ? uniqueValues.filter((v) =>
        v.toLowerCase().includes(search.toLowerCase()),
      )
    : uniqueValues;

  // Initialize selected from active filter when opening
  useEffect(() => {
    if (open) {
      setSelected(activeFilter ? new Set(activeFilter) : new Set(uniqueValues));
      setSearch("");
    }
  }, [open]);

  function handleToggle(val: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setSelected(new Set(uniqueValues));
  }

  function handleClear() {
    setSelected(new Set());
  }

  function handleApply() {
    if (selected.size === uniqueValues.length || selected.size === 0) {
      // All selected or none = remove filter
      onFilterChange(col, null);
    } else {
      onFilterChange(col, selected);
    }
    setOpen(false);
  }

  const isActive = !!activeFilter;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 size-3.5 flex items-center justify-center rounded-sm transition-opacity",
            isActive
              ? "text-primary opacity-100"
              : "text-muted-foreground opacity-0 group-hover/colhdr:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className="size-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-52 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[10px] text-primary hover:underline"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-muted-foreground hover:underline"
          >
            Clear
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto p-1">
          {filteredValues.map((val) => (
            <label
              key={val}
              className="flex items-center gap-2 px-1.5 py-1 text-xs hover:bg-accent rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(val)}
                onChange={() => handleToggle(val)}
                className="size-3 accent-primary"
              />
              <span className="truncate">{val || "(empty)"}</span>
            </label>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <Button size="sm" className="w-full h-7 text-xs" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
