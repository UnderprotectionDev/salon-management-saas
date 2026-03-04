import { adjustFormulaRefs } from "./fill-series";
import type { CellData, CellMap } from "./spreadsheet-types";
import { cellRef } from "./spreadsheet-utils";

export interface GridKeyboardDeps {
  editingCell: string | null;
  selectedCell: string;
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  columnCount: number;
  rowCount: number;
  cells: CellMap;
  readOnlyCells: Set<string>;
  // Actions
  undo: () => void;
  redo: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;
  setSearchOpen: (open: boolean) => void;
  onOpenShortcuts: () => void;
  setSelectedCell: (ref: string) => void;
  setSelectionRange: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;
  setEditingValue: (val: string) => void;
  onCellChange: (ref: string, data: CellData) => void;
  // Callbacks from the component
  startEditing: (ref: string, initialValue?: string) => void;
  commitEdit: () => void;
  getSelectedCoords: () => { row: number; col: number };
  // Autocomplete
  autocompleteHandleKeyDown: (e: React.KeyboardEvent) => boolean;
  // Paste special
  setPasteSpecialPos: (pos: { x: number; y: number } | null) => void;
  containerRect: DOMRect | null;
}

export interface FillDeps {
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  cells: CellMap;
  readOnlyCells: Set<string>;
  onCellChange: (ref: string, data: CellData) => void;
}

/**
 * Fill Down: copy top row of selection to all rows below
 */
export function handleFillDown(deps: FillDeps) {
  const { selectionRange, cells, readOnlyCells, onCellChange } = deps;
  if (!selectionRange) return;
  const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
  const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
  const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
  const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
  if (minR === maxR) return;

  for (let c = minC; c <= maxC; c++) {
    const sourceRef = cellRef(minR, c);
    const sourceVal = cells[sourceRef]?.value ?? "";
    const sourceData = cells[sourceRef] ?? { value: "" };
    for (let r = minR + 1; r <= maxR; r++) {
      const ref = cellRef(r, c);
      if (readOnlyCells.has(ref)) continue;
      const newVal = sourceVal.startsWith("=")
        ? adjustFormulaRefs(sourceVal, r - minR, 0)
        : sourceVal;
      onCellChange(ref, { ...sourceData, value: newVal });
    }
  }
}

/**
 * Fill Right: copy left column of selection to all columns right
 */
export function handleFillRight(deps: FillDeps) {
  const { selectionRange, cells, readOnlyCells, onCellChange } = deps;
  if (!selectionRange) return;
  const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
  const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
  const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
  const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
  if (minC === maxC) return;

  for (let r = minR; r <= maxR; r++) {
    const sourceRef = cellRef(r, minC);
    const sourceVal = cells[sourceRef]?.value ?? "";
    const sourceData = cells[sourceRef] ?? { value: "" };
    for (let c = minC + 1; c <= maxC; c++) {
      const ref = cellRef(r, c);
      if (readOnlyCells.has(ref)) continue;
      const newVal = sourceVal.startsWith("=")
        ? adjustFormulaRefs(sourceVal, 0, c - minC)
        : sourceVal;
      onCellChange(ref, { ...sourceData, value: newVal });
    }
  }
}

/**
 * Main keyboard handler for the spreadsheet grid.
 * Returns true if the event was handled.
 */
export function handleGridKeyDown(
  e: React.KeyboardEvent,
  deps: GridKeyboardDeps,
): boolean {
  const mod = e.ctrlKey || e.metaKey;

  // Undo/Redo
  if (mod && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    deps.undo();
    return true;
  }
  if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    deps.redo();
    return true;
  }

  // Clipboard
  if (mod && e.key === "c") {
    e.preventDefault();
    deps.copySelection();
    return true;
  }
  if (mod && e.key === "x") {
    e.preventDefault();
    deps.cutSelection();
    return true;
  }
  if (mod && e.key === "v" && !e.shiftKey) {
    e.preventDefault();
    deps.pasteSelection();
    return true;
  }
  // Paste Special: Ctrl+Shift+V
  if (mod && e.key === "v" && e.shiftKey) {
    e.preventDefault();
    const rect = deps.containerRect;
    deps.setPasteSpecialPos({
      x: (rect?.left ?? 200) + 100,
      y: (rect?.top ?? 100) + 50,
    });
    return true;
  }
  if (mod && e.key === "f") {
    e.preventDefault();
    deps.setSearchOpen(true);
    return true;
  }
  // Keyboard shortcuts dialog
  if (mod && e.key === "/") {
    e.preventDefault();
    deps.onOpenShortcuts();
    return true;
  }

  // Ctrl+D: Fill Down
  if (mod && e.key === "d" && !e.shiftKey) {
    e.preventDefault();
    handleFillDown({
      selectionRange: deps.selectionRange,
      cells: deps.cells,
      readOnlyCells: deps.readOnlyCells,
      onCellChange: deps.onCellChange,
    });
    return true;
  }
  // Ctrl+R: Fill Right
  if (mod && e.key === "r" && !e.shiftKey) {
    e.preventDefault();
    handleFillRight({
      selectionRange: deps.selectionRange,
      cells: deps.cells,
      readOnlyCells: deps.readOnlyCells,
      onCellChange: deps.onCellChange,
    });
    return true;
  }

  if (deps.editingCell) {
    // If autocomplete is open, let it handle keys first
    if (deps.autocompleteHandleKeyDown(e)) return true;
    return true;
  }

  const { row, col } = deps.getSelectedCoords();

  // Shift+Arrow: extend selection range
  if (e.shiftKey && e.key.startsWith("Arrow")) {
    e.preventDefault();
    const sr = deps.selectionRange ?? {
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    };
    if (e.key === "ArrowRight") {
      deps.setSelectionRange({
        ...sr,
        endCol: Math.min(sr.endCol + 1, deps.columnCount - 1),
      });
    } else if (e.key === "ArrowLeft") {
      deps.setSelectionRange({ ...sr, endCol: Math.max(sr.endCol - 1, 0) });
    } else if (e.key === "ArrowDown") {
      deps.setSelectionRange({
        ...sr,
        endRow: Math.min(sr.endRow + 1, deps.rowCount - 1),
      });
    } else if (e.key === "ArrowUp") {
      deps.setSelectionRange({ ...sr, endRow: Math.max(sr.endRow - 1, 0) });
    }
    return true;
  }

  if (e.key === "ArrowRight") {
    e.preventDefault();
    deps.setSelectedCell(cellRef(row, Math.min(col + 1, deps.columnCount - 1)));
    deps.setSelectionRange(null);
    return true;
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    deps.setSelectedCell(cellRef(row, Math.max(col - 1, 0)));
    deps.setSelectionRange(null);
    return true;
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    deps.setSelectedCell(cellRef(Math.min(row + 1, deps.rowCount - 1), col));
    deps.setSelectionRange(null);
    return true;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    deps.setSelectedCell(cellRef(Math.max(row - 1, 0), col));
    deps.setSelectionRange(null);
    return true;
  } else if (e.key === "Enter") {
    e.preventDefault();
    deps.setSelectedCell(cellRef(Math.min(row + 1, deps.rowCount - 1), col));
    deps.setSelectionRange(null);
    return true;
  } else if (e.key === "Tab") {
    e.preventDefault();
    deps.setSelectedCell(cellRef(row, Math.min(col + 1, deps.columnCount - 1)));
    deps.setSelectionRange(null);
    return true;
  } else if (e.key === "Delete" || e.key === "Backspace") {
    const range = deps.selectionRange;
    if (range) {
      const minR = Math.min(range.startRow, range.endRow);
      const maxR = Math.max(range.startRow, range.endRow);
      const minC = Math.min(range.startCol, range.endCol);
      const maxC = Math.max(range.startCol, range.endCol);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const ref = cellRef(r, c);
          if (!deps.readOnlyCells.has(ref)) {
            const existing = deps.cells[ref] || { value: "" };
            deps.onCellChange(ref, { ...existing, value: "" });
          }
        }
      }
    } else if (!deps.readOnlyCells.has(deps.selectedCell)) {
      const existing = deps.cells[deps.selectedCell] || { value: "" };
      deps.onCellChange(deps.selectedCell, { ...existing, value: "" });
    }
    deps.setEditingValue("");
    return true;
  } else if (e.key === "F2") {
    deps.startEditing(deps.selectedCell);
    return true;
  } else if (
    e.key === "=" ||
    (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
  ) {
    e.preventDefault();
    deps.startEditing(deps.selectedCell, e.key);
    return true;
  }

  return false;
}
