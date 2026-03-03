import { colLabel } from "./spreadsheet-utils";

export type FormulaFn = "SUM" | "AVERAGE" | "COUNT" | "MAX" | "MIN" | "SUMIF" | "COUNTIF";

/**
 * Build a formula string like "=SUM(A1:D5)" from a selection range.
 * Returns null if the selection is a single cell.
 */
export function buildSelectionFormula(
  fn: FormulaFn,
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null,
): string | null {
  if (!selectionRange) return null;

  const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
  const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
  const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
  const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

  // Single cell — no formula
  if (minR === maxR && minC === maxC) return null;

  const startRef = `${colLabel(minC)}${minR + 1}`;
  const endRef = `${colLabel(maxC)}${maxR + 1}`;

  return `=${fn}(${startRef}:${endRef})`;
}

/**
 * Copy a formula string to the clipboard.
 * Returns true on success.
 */
export async function copyFormulaToClipboard(
  formula: string,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formula);
    return true;
  } catch {
    return false;
  }
}
