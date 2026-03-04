/**
 * Spreadsheet CSS class name constants.
 * Most dynamic values (bgColor, width, left) remain inline styles;
 * these classes handle the static / frequently-reused base styling.
 */
export const SHEET_CLASSES = {
  cell: "sheet-cell",
  cellSelected: "sheet-cell--selected",
  cellFrozen: "sheet-cell--frozen",
  cellInRange: "sheet-cell--in-range",
  cellEditing: "sheet-cell--editing",
  cellDisplay: "sheet-cell__display",
  rowHeader: "sheet-row-header",
  rowHeaderActive: "sheet-row-header--active",
  colHeader: "sheet-col-header",
  colHeaderActive: "sheet-col-header--active",
  fillHandle: "sheet-fill-handle",
} as const;
