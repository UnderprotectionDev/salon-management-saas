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
  /** Cell input type for specialized editing */
  cellType?: "text" | "dropdown" | "date";
  /** Options for dropdown cells */
  dropdownOptions?: { value: string; label: string }[];
  /** Convex document _id for this row's record (used for row CRUD) */
  recordId?: string;
  /** Validation rule (JSON-serialized to/from Convex) */
  validationRule?: import("./validation-types").ValidationRule;
}

/** Column width overrides per column index */
export type ColumnWidths = Record<number, number>;

/** State for the right-click context menu */
export interface ContextMenuState {
  x: number;
  y: number;
  row: number;
  col: number;
  cellRef: string;
}

/** Map of cell references (e.g. "A1") to their data */
export type CellMap = Record<string, CellData>;

/** Sheet tab definition */
export interface SheetTab {
  id: string;
  label: string;
  /** Number of columns to display for this tab */
  columnCount?: number;
  /** Number of rows to display for this tab */
  rowCount?: number;
  /** Freeze pane: number of rows frozen from top */
  freezeRow?: number;
  /** Freeze pane: number of columns frozen from left */
  freezeCol?: number;
  /** Merged cell regions */
  mergedRegions?: import("./merge-utils").MergedRegion[];
  /** Conditional formatting rules (JSON string or parsed) */
  conditionalFormats?:
    | import("./conditional-format-types").CondFormatRule[]
    | string;
}

export const GRID = {
  ROW_HEIGHT: 26,
  COL_HEADER_HEIGHT: 24,
  ROW_HEADER_WIDTH: 46,
  DEFAULT_COL_WIDTH: 120,
  MIN_COL_WIDTH: 40,
  MAX_COLS: 52,
  DEFAULT_FREEFORM_COLS: 10,
  MAX_ROWS: 5000,
  DEFAULT_FREEFORM_ROWS: 20,
} as const;
