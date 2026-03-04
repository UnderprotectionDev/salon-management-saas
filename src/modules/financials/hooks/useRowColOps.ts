import type React from "react";
import {
  shiftColsLeft,
  shiftColsRight,
  shiftRowsDown,
  shiftRowsUp,
} from "../lib/cell-shift";
import type { MergedRegion } from "../lib/merge-utils";
import {
  adjustMergesOnColShift,
  adjustMergesOnRowShift,
} from "../lib/merge-utils";
import type { CellMap } from "../lib/spreadsheet-types";
import { GRID } from "../lib/spreadsheet-types";
import type { UndoEntry } from "./useUndoHistory";

interface UseRowColOpsDeps {
  mergedCells: CellMap;
  rowCount: number;
  columnCount: number;
  mergedRegions: MergedRegion[];
  onBulkReplace?: (cells: CellMap) => void;
  onAddRow?: () => void;
  onDeleteLastRow?: () => void;
  onAddColumn?: () => void;
  onDeleteLastColumn?: () => void;
  onSetMergedRegions?: (regions: MergedRegion[]) => void;
  undoHistory: {
    pushBatch: (entries: UndoEntry[]) => void;
  };
  setOptimisticCells: React.Dispatch<React.SetStateAction<CellMap>>;
}

function computeUndoEntries(before: CellMap, after: CellMap): UndoEntry[] {
  const entries: UndoEntry[] = [];
  const allRefs = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const ref of allRefs) {
    const b = before[ref] ?? { value: "" };
    const a = after[ref] ?? { value: "" };
    if (b.value !== a.value || JSON.stringify(b) !== JSON.stringify(a)) {
      entries.push({ ref, before: b, after: a });
    }
  }
  return entries;
}

export function useRowColOps(deps: UseRowColOpsDeps) {
  function handleInsertRowAbove(row: number) {
    if (deps.rowCount >= GRID.MAX_ROWS || !deps.onBulkReplace || !deps.onAddRow)
      return;
    const newCells = shiftRowsDown(deps.mergedCells, row, deps.rowCount);
    const undoEntries = computeUndoEntries(deps.mergedCells, newCells);
    deps.undoHistory.pushBatch(undoEntries);
    deps.setOptimisticCells(newCells);
    deps.onBulkReplace(newCells);
    deps.onAddRow();
    if (deps.onSetMergedRegions && deps.mergedRegions.length > 0) {
      deps.onSetMergedRegions(
        adjustMergesOnRowShift(deps.mergedRegions, row, 1),
      );
    }
  }

  function handleInsertRowBelow(row: number) {
    handleInsertRowAbove(row + 1);
  }

  function handleDeleteRow(row: number) {
    if (deps.rowCount <= 1 || !deps.onBulkReplace || !deps.onDeleteLastRow)
      return;
    const newCells = shiftRowsUp(deps.mergedCells, row);
    const undoEntries = computeUndoEntries(deps.mergedCells, newCells);
    deps.undoHistory.pushBatch(undoEntries);
    deps.setOptimisticCells(newCells);
    deps.onBulkReplace(newCells);
    deps.onDeleteLastRow();
    if (deps.onSetMergedRegions && deps.mergedRegions.length > 0) {
      deps.onSetMergedRegions(
        adjustMergesOnRowShift(deps.mergedRegions, row, -1),
      );
    }
  }

  function handleInsertColumnLeft(col: number) {
    if (
      deps.columnCount >= GRID.MAX_COLS ||
      !deps.onBulkReplace ||
      !deps.onAddColumn
    )
      return;
    const newCells = shiftColsRight(deps.mergedCells, col, deps.columnCount);
    const undoEntries = computeUndoEntries(deps.mergedCells, newCells);
    deps.undoHistory.pushBatch(undoEntries);
    deps.setOptimisticCells(newCells);
    deps.onBulkReplace(newCells);
    deps.onAddColumn();
    if (deps.onSetMergedRegions && deps.mergedRegions.length > 0) {
      deps.onSetMergedRegions(
        adjustMergesOnColShift(deps.mergedRegions, col, 1),
      );
    }
  }

  function handleInsertColumnRight(col: number) {
    handleInsertColumnLeft(col + 1);
  }

  function handleDeleteColumn(col: number) {
    if (
      deps.columnCount <= 1 ||
      !deps.onBulkReplace ||
      !deps.onDeleteLastColumn
    )
      return;
    const newCells = shiftColsLeft(deps.mergedCells, col);
    const undoEntries = computeUndoEntries(deps.mergedCells, newCells);
    deps.undoHistory.pushBatch(undoEntries);
    deps.setOptimisticCells(newCells);
    deps.onBulkReplace(newCells);
    deps.onDeleteLastColumn();
    if (deps.onSetMergedRegions && deps.mergedRegions.length > 0) {
      deps.onSetMergedRegions(
        adjustMergesOnColShift(deps.mergedRegions, col, -1),
      );
    }
  }

  return {
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDeleteRow,
    handleInsertColumnLeft,
    handleInsertColumnRight,
    handleDeleteColumn,
  };
}
