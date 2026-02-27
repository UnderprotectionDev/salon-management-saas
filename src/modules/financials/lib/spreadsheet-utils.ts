import type { SelectionRange } from "./spreadsheet-types";

export function colLabel(index: number): string {
  let result = "";
  let n = index + 1;
  while (n > 0) {
    result = String.fromCharCode(64 + (n % 26 || 26)) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function cellRef(row: number, col: number): string {
  return `${colLabel(col)}${row + 1}`;
}

export function normalizeRange(range: SelectionRange) {
  return {
    minRow: Math.min(range.start.row, range.end.row),
    maxRow: Math.max(range.start.row, range.end.row),
    minCol: Math.min(range.start.col, range.end.col),
    maxCol: Math.max(range.start.col, range.end.col),
  };
}

export function isCellInRange(
  row: number,
  col: number,
  normalized: {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
  },
): boolean {
  return (
    row >= normalized.minRow &&
    row <= normalized.maxRow &&
    col >= normalized.minCol &&
    col <= normalized.maxCol
  );
}
