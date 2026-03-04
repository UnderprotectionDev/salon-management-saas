"use client";

import { useState } from "react";
import type { CellMap } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";

export function useColumnFilters() {
  const [columnFilters, setColumnFilters] = useState<
    Record<number, Set<string>>
  >({});

  function setColumnFilter(col: number, values: Set<string> | null) {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (values === null) {
        delete next[col];
      } else {
        next[col] = values;
      }
      return next;
    });
  }

  function clearAllFilters() {
    setColumnFilters({});
  }

  /** Returns the set of visible row indices (1-based data rows), or null if no filters are active */
  function getFilteredRowIndices(
    cells: CellMap,
    _columnCount: number,
    rowCount: number,
  ): Set<number> | null {
    const activeCols = Object.keys(columnFilters).map(Number);
    if (activeCols.length === 0) return null;

    const visible = new Set<number>();
    // Row 0 is header, always visible; filter data rows (1 to rowCount-1)
    for (let r = 1; r < rowCount; r++) {
      let passes = true;
      for (const col of activeCols) {
        const ref = cellRef(r, col);
        const val = cells[ref]?.value ?? "";
        if (!columnFilters[col].has(val)) {
          passes = false;
          break;
        }
      }
      if (passes) visible.add(r);
    }
    return visible;
  }

  const hasActiveFilters = Object.keys(columnFilters).length > 0;

  return {
    columnFilters,
    setColumnFilter,
    clearAllFilters,
    getFilteredRowIndices,
    hasActiveFilters,
  };
}
