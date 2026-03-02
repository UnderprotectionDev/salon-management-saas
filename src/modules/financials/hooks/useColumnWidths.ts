"use client";

import { useState } from "react";
import { GRID, type ColumnWidths } from "../lib/spreadsheet-types";

export function useColumnWidths() {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});

  function setColumnWidth(col: number, width: number) {
    setColumnWidths((prev) => ({
      ...prev,
      [col]: Math.max(GRID.MIN_COL_WIDTH, width),
    }));
  }

  function resetWidths() {
    setColumnWidths({});
  }

  return { columnWidths, setColumnWidth, resetWidths };
}
