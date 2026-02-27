export interface CellCoord {
  row: number;
  col: number;
}

export interface SelectionRange {
  start: CellCoord;
  end: CellCoord;
}

/** Cell data with value + optional formatting */
export interface CellData {
  value: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  fontSize?: string;
  fontFamily?: string;
  bgColor?: string;
  textColor?: string;
  numberFormat?: import("./number-format").NumberFormat;
}

/** Map of cell references (e.g. "A1") to their data */
export type CellMap = Record<string, CellData>;

/** Sheet tab definition */
export interface SheetTab {
  id: string;
  label: string;
  /** Fixed tabs are backed by Convex data and cannot be deleted/renamed */
  isFixed?: boolean;
  /** Tab type for fixed tabs */
  type?: "expenses" | "revenue" | "commissions" | "giftcards" | "closing";
  /** Number of columns to display for this tab */
  columnCount?: number;
  /** Number of rows to display for this tab */
  rowCount?: number;
}

export const GRID = {
  ROW_HEIGHT: 26,
  COL_HEADER_HEIGHT: 24,
  ROW_HEADER_WIDTH: 46,
  DEFAULT_COL_WIDTH: 120,
  MIN_COL_WIDTH: 40,
  MAX_COLS: 52,
  DEFAULT_FREEFORM_COLS: 10,
  MAX_ROWS: 200,
  DEFAULT_FREEFORM_ROWS: 20,
} as const;

/** Compute the row count for a fixed tab from its cell data */
export function getRowCountFromCells(cells: Record<string, unknown>): number {
  let maxRow = 0;
  for (const ref of Object.keys(cells)) {
    const m = ref.match(/^[A-Z]+(\d+)$/);
    if (m) {
      const row = Number.parseInt(m[1], 10);
      if (row > maxRow) maxRow = row;
    }
  }
  // Add 1 buffer row after the last data row
  return Math.max(maxRow + 1, 1);
}

/** Returns the exact column count for each fixed tab type */
export function getFixedTabColCount(
  type: "expenses" | "revenue" | "commissions" | "giftcards" | "closing",
): number {
  switch (type) {
    case "expenses":
      return 8;
    case "revenue":
      return 5;
    case "giftcards":
      return 8;
    case "commissions":
      return 5;
    case "closing":
      return 2;
  }
}
