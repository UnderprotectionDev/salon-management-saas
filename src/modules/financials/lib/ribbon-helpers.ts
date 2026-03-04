import { evalFormula, parseRef } from "./spreadsheet-formula";
import type { CellData, CellMap } from "./spreadsheet-types";
import { cellRef, colLabel } from "./spreadsheet-utils";

/**
 * Export spreadsheet as CSV with UTF-8 BOM
 */
export function handleExportCsv(
  cells: CellMap,
  rowCount: number,
  columnCount: number,
) {
  const maxRow = rowCount;
  const maxCol = columnCount;
  const rows: string[] = [];
  for (let r = 0; r < maxRow; r++) {
    const cols: string[] = [];
    for (let c = 0; c < maxCol; c++) {
      const ref = cellRef(r, c);
      const cell = cells[ref];
      if (!cell?.value) {
        cols.push("");
        continue;
      }
      const raw = cell.value.startsWith("=")
        ? evalFormula(cell.value, cells)
        : cell.value;
      // Escape CSV: wrap in quotes if contains comma, quote, or newline
      const str = String(raw);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        cols.push(`"${str.replace(/"/g, '""')}"`);
      } else {
        cols.push(str);
      }
    }
    rows.push(cols.join(","));
  }
  // Remove trailing empty rows
  while (rows.length > 0 && rows[rows.length - 1].replace(/,/g, "") === "") {
    rows.pop();
  }
  const bom = "\uFEFF";
  const blob = new Blob([bom + rows.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spreadsheet-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Strip currency/percent/locale formatting so we can detect numeric values
 */
export function normalizeNumeric(val: string): number {
  const stripped = val.replace(/[₺$€%\s]/g, "");
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let cleaned: string;
  if (lastComma > lastDot) {
    cleaned = stripped.replace(/\./g, "").replace(/,/g, ".");
  } else {
    cleaned = stripped.replace(/,/g, "");
  }
  return Number(cleaned);
}

export interface AutoSumDeps {
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  selectedCell: string;
  readOnlyCells: Set<string>;
  cells: CellMap;
  onCellChange: (ref: string, data: CellData) => void;
  setEditingValue: (val: string) => void;
  buildSelectionFormula: (
    fn: string,
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    },
  ) => string | null;
  copyFormulaToClipboard: (formula: string) => Promise<boolean>;
}

/**
 * AutoSum — if multi-cell selection, copy formula to clipboard;
 * otherwise fall back to inserting into the active cell
 */
export async function handleAutoSum(
  fn: string,
  deps: AutoSumDeps,
): Promise<void> {
  const {
    selectionRange,
    selectedCell,
    readOnlyCells,
    cells,
    onCellChange,
    setEditingValue,
    buildSelectionFormula: buildFormula,
    copyFormulaToClipboard: copyFormula,
  } = deps;

  const hasSelectionRange =
    selectionRange &&
    (Math.abs(selectionRange.startRow - selectionRange.endRow) > 0 ||
      Math.abs(selectionRange.startCol - selectionRange.endCol) > 0);

  // Multi-cell selection → copy formula to clipboard
  if (hasSelectionRange && selectionRange) {
    const formula = buildFormula(fn, selectionRange);
    if (formula) {
      const ok = await copyFormula(formula);
      if (ok) {
        const { toast } = await import("sonner");
        toast.success(`Copied ${formula}`);
      }
    }
    return;
  }

  // Single cell — scan upward for contiguous numbers
  if (readOnlyCells.has(selectedCell)) return;
  const m = selectedCell.match(/^([A-Z]+)(\d+)$/);
  if (!m) return;
  const col = m[1];
  const row = Number.parseInt(m[2], 10);

  let startRow = row - 1;
  while (startRow >= 1) {
    const ref = `${col}${startRow}`;
    const val = cells[ref]?.value?.trim();
    if (!val || Number.isNaN(normalizeNumeric(val))) break;
    startRow--;
  }
  startRow++;

  if (startRow < row) {
    const formula = `=${fn}(${col}${startRow}:${col}${row - 1})`;
    const existing = cells[selectedCell] ?? { value: "" };
    onCellChange(selectedCell, { ...existing, value: formula });
    setEditingValue(formula);
  }
}

/**
 * Auto-detect contiguous data region from a cell
 */
export function detectDataRegion(
  cellRefStr: string,
  cells: CellMap,
): {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
  sortColOffset: number;
} | null {
  const parsed = parseRef(cellRefStr);
  if (!parsed) return null;
  const { row: selRow, col: selCol } = parsed;

  const hasData = (r: number, c: number) =>
    !!cells[cellRef(r, c)]?.value?.trim();

  let minR = selRow;
  while (minR > 0 && hasData(minR - 1, selCol)) minR--;

  let maxR = selRow;
  while (maxR < 999 && hasData(maxR + 1, selCol)) maxR++;

  if (minR === maxR) return null;

  let minC = selCol;
  while (minC > 0) {
    let found = false;
    for (let r = minR; r <= maxR; r++) {
      if (hasData(r, minC - 1)) {
        found = true;
        break;
      }
    }
    if (!found) break;
    minC--;
  }

  let maxC = selCol;
  while (maxC < 51) {
    let found = false;
    for (let r = minR; r <= maxR; r++) {
      if (hasData(r, maxC + 1)) {
        found = true;
        break;
      }
    }
    if (!found) break;
    maxC++;
  }

  return { minR, maxR, minC, maxC, sortColOffset: selCol - minC };
}

export interface SortDeps {
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  selectedCell: string;
  cells: CellMap;
  readOnlyCells: Set<string>;
  onCellChange: (ref: string, data: CellData) => void;
}

/**
 * Sort helper — sorts rows in selected range or auto-detected data region
 */
export function handleSort(ascending: boolean, deps: SortDeps) {
  const { selectionRange, selectedCell, cells, readOnlyCells, onCellChange } =
    deps;

  let minR: number;
  let maxR: number;
  let minC: number;
  let maxC: number;
  let sortColOffset = 0;

  const hasMultiRowSelection =
    selectionRange &&
    Math.abs(selectionRange.startRow - selectionRange.endRow) > 0;

  if (hasMultiRowSelection) {
    minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    sortColOffset = 0;
  } else {
    if (!selectedCell) return;
    const region = detectDataRegion(selectedCell, cells);
    if (!region) return;
    minR = region.minR;
    maxR = region.maxR;
    minC = region.minC;
    maxC = region.maxC;
    sortColOffset = region.sortColOffset;
  }

  const rows: { row: number; cells: (CellData | undefined)[] }[] = [];
  for (let r = minR; r <= maxR; r++) {
    const rowCells: (CellData | undefined)[] = [];
    for (let c = minC; c <= maxC; c++) {
      const ref = `${colLabel(c)}${r + 1}`;
      rowCells.push(cells[ref] ? { ...cells[ref] } : undefined);
    }
    rows.push({ row: r, cells: rowCells });
  }

  rows.sort((a, b) => {
    const aVal = a.cells[sortColOffset]?.value ?? "";
    const bVal = b.cells[sortColOffset]?.value ?? "";
    const aNum = normalizeNumeric(aVal);
    const bNum = normalizeNumeric(bVal);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return ascending ? aNum - bNum : bNum - aNum;
    }
    return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const ref = `${colLabel(c)}${r + 1}`;
      if (readOnlyCells.has(ref)) return;
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const r = minR + i;
    for (let c = minC; c <= maxC; c++) {
      const ref = `${colLabel(c)}${r + 1}`;
      const cellData = rows[i].cells[c - minC];
      onCellChange(ref, cellData ?? { value: "" });
    }
  }
}
