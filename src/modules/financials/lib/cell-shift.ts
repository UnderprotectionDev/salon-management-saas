/**
 * Utilities for shifting cells when inserting/deleting rows and columns.
 * Also updates formula references to maintain correctness.
 */
import type { CellMap } from "./spreadsheet-types";
import { cellRef, colLabel } from "./spreadsheet-utils";

/** Parse "A1" to { row, col } (0-indexed) */
function parseRef(ref: string): { row: number; col: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return { row: Number.parseInt(m[2], 10) - 1, col: col - 1 };
}

/**
 * Update formula references when rows shift.
 * Adjusts row numbers in cell references by `delta` for rows >= `fromRow`.
 * Returns updated formula string, or original if no refs changed.
 */
export function updateFormulaRefsOnRowShift(
  formula: string,
  fromRow: number, // 0-indexed
  delta: number, // +1 for insert, -1 for delete
): string {
  if (!formula.startsWith("=")) return formula;
  return (
    "=" +
    formula
      .slice(1)
      .replace(
        /(\$?)([A-Z]{1,3})(\$?)(\d{1,5})/g,
        (
          _match,
          colDollar: string,
          colStr: string,
          rowDollar: string,
          rowStr: string,
        ) => {
          if (rowDollar === "$")
            return `${colDollar}${colStr}${rowDollar}${rowStr}`;
          const row = Number.parseInt(rowStr, 10) - 1; // 0-indexed
          if (row >= fromRow) {
            const newRow = row + delta;
            if (newRow < 0) return "#REF!";
            return `${colDollar}${colStr}${rowDollar}${newRow + 1}`;
          }
          return `${colDollar}${colStr}${rowDollar}${rowStr}`;
        },
      )
  );
}

/**
 * Update formula references when columns shift.
 * Adjusts column letters in cell references by `delta` for cols >= `fromCol`.
 */
export function updateFormulaRefsOnColShift(
  formula: string,
  fromCol: number, // 0-indexed
  delta: number, // +1 for insert, -1 for delete
): string {
  if (!formula.startsWith("=")) return formula;
  return (
    "=" +
    formula
      .slice(1)
      .replace(
        /(\$?)([A-Z]{1,3})(\$?)(\d{1,5})/g,
        (
          _match,
          colDollar: string,
          colStr: string,
          rowDollar: string,
          rowStr: string,
        ) => {
          if (colDollar === "$")
            return `${colDollar}${colStr}${rowDollar}${rowStr}`;
          let col = 0;
          for (const ch of colStr) col = col * 26 + ch.charCodeAt(0) - 64;
          col -= 1; // 0-indexed
          if (col >= fromCol) {
            const newCol = col + delta;
            if (newCol < 0) return "#REF!";
            return `${colDollar}${colLabel(newCol)}${rowDollar}${rowStr}`;
          }
          return `${colDollar}${colStr}${rowDollar}${rowStr}`;
        },
      )
  );
}

/**
 * Insert a row: shift all cells at row >= insertRow down by 1.
 * Returns a new CellMap with updated keys and formula references.
 */
export function shiftRowsDown(
  cells: CellMap,
  insertRow: number, // 0-indexed row where blank row will appear
  maxRow: number,
): CellMap {
  const result: CellMap = {};

  for (const [ref, data] of Object.entries(cells)) {
    const parsed = parseRef(ref);
    if (!parsed) {
      result[ref] = data;
      continue;
    }
    const { row, col } = parsed;
    const newData = { ...data };
    if (newData.value.startsWith("=")) {
      newData.value = updateFormulaRefsOnRowShift(newData.value, insertRow, 1);
    }
    if (row >= insertRow) {
      if (row + 1 <= maxRow) {
        result[cellRef(row + 1, col)] = newData;
      }
    } else {
      result[cellRef(row, col)] = newData;
    }
  }
  return result;
}

/**
 * Delete a row: shift all cells at row > deleteRow up by 1.
 * Cells at deleteRow are removed.
 */
export function shiftRowsUp(
  cells: CellMap,
  deleteRow: number, // 0-indexed row to remove
): CellMap {
  const result: CellMap = {};

  for (const [ref, data] of Object.entries(cells)) {
    const parsed = parseRef(ref);
    if (!parsed) {
      result[ref] = data;
      continue;
    }
    const { row, col } = parsed;
    if (row === deleteRow) continue; // deleted
    const newData = { ...data };
    if (newData.value.startsWith("=")) {
      newData.value = updateFormulaRefsOnRowShift(newData.value, deleteRow, -1);
    }
    if (row > deleteRow) {
      result[cellRef(row - 1, col)] = newData;
    } else {
      result[cellRef(row, col)] = newData;
    }
  }
  return result;
}

/**
 * Insert a column: shift all cells at col >= insertCol right by 1.
 */
export function shiftColsRight(
  cells: CellMap,
  insertCol: number, // 0-indexed col where blank column will appear
  maxCol: number,
): CellMap {
  const result: CellMap = {};

  for (const [ref, data] of Object.entries(cells)) {
    const parsed = parseRef(ref);
    if (!parsed) {
      result[ref] = data;
      continue;
    }
    const { row, col } = parsed;
    const newData = { ...data };
    if (newData.value.startsWith("=")) {
      newData.value = updateFormulaRefsOnColShift(newData.value, insertCol, 1);
    }
    if (col >= insertCol) {
      if (col + 1 <= maxCol) {
        result[cellRef(row, col + 1)] = newData;
      }
    } else {
      result[cellRef(row, col)] = newData;
    }
  }
  return result;
}

/**
 * Delete a column: shift all cells at col > deleteCol left by 1.
 * Cells at deleteCol are removed.
 */
export function shiftColsLeft(
  cells: CellMap,
  deleteCol: number, // 0-indexed col to remove
): CellMap {
  const result: CellMap = {};

  for (const [ref, data] of Object.entries(cells)) {
    const parsed = parseRef(ref);
    if (!parsed) {
      result[ref] = data;
      continue;
    }
    const { row, col } = parsed;
    if (col === deleteCol) continue; // deleted
    const newData = { ...data };
    if (newData.value.startsWith("=")) {
      newData.value = updateFormulaRefsOnColShift(newData.value, deleteCol, -1);
    }
    if (col > deleteCol) {
      result[cellRef(row, col - 1)] = newData;
    } else {
      result[cellRef(row, col)] = newData;
    }
  }
  return result;
}
