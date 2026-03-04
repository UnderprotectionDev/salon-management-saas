import { useState } from "react";
import {
  adjustFormulaRefs,
  detectSeries,
  generateFillValue,
} from "../lib/fill-series";
import type { CellData, CellMap } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";
import type { UndoEntry } from "./useUndoHistory";

interface UseFillHandleDeps {
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  getSelectedCoords: () => { row: number; col: number };
  mergedCells: CellMap;
  readOnlyCells: Set<string>;
  onCellChange: (ref: string, data: CellData) => void;
  undoHistory: {
    pushBatch: (entries: UndoEntry[]) => void;
  };
  setOptimisticCells: React.Dispatch<React.SetStateAction<CellMap>>;
  setSelectionRange: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;
}

export function useFillHandle(deps: UseFillHandleDeps) {
  const [fillHandleActive, setFillHandleActive] = useState(false);
  const [fillHandleRange, setFillHandleRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);

  function handleFillHandleStart() {
    setFillHandleActive(true);
    if (deps.selectionRange) {
      setFillHandleRange({ ...deps.selectionRange });
    } else {
      const { row, col } = deps.getSelectedCoords();
      setFillHandleRange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      });
    }
  }

  function handleFillHandleDrag(row: number, col: number) {
    if (!fillHandleActive) return;
    const sr =
      deps.selectionRange ??
      (() => {
        const { row: r, col: c } = deps.getSelectedCoords();
        return { startRow: r, startCol: c, endRow: r, endCol: c };
      })();
    const minR = Math.min(sr.startRow, sr.endRow);
    const maxR = Math.max(sr.startRow, sr.endRow);
    const minC = Math.min(sr.startCol, sr.endCol);
    const maxC = Math.max(sr.startCol, sr.endCol);

    const rowDist = Math.abs(row - maxR) + Math.abs(row - minR);
    const colDist = Math.abs(col - maxC) + Math.abs(col - minC);

    if (rowDist >= colDist) {
      setFillHandleRange({
        startRow: minR,
        startCol: minC,
        endRow: row,
        endCol: maxC,
      });
    } else {
      setFillHandleRange({
        startRow: minR,
        startCol: minC,
        endRow: maxR,
        endCol: col,
      });
    }
  }

  function handleFillHandleEnd() {
    if (!fillHandleActive || !fillHandleRange) {
      setFillHandleActive(false);
      setFillHandleRange(null);
      return;
    }

    const sr =
      deps.selectionRange ??
      (() => {
        const { row: r, col: c } = deps.getSelectedCoords();
        return { startRow: r, startCol: c, endRow: r, endCol: c };
      })();
    const srcMinR = Math.min(sr.startRow, sr.endRow);
    const srcMaxR = Math.max(sr.startRow, sr.endRow);
    const srcMinC = Math.min(sr.startCol, sr.endCol);
    const srcMaxC = Math.max(sr.startCol, sr.endCol);

    const fillMinR = Math.min(fillHandleRange.startRow, fillHandleRange.endRow);
    const fillMaxR = Math.max(fillHandleRange.startRow, fillHandleRange.endRow);
    const fillMinC = Math.min(fillHandleRange.startCol, fillHandleRange.endCol);
    const fillMaxC = Math.max(fillHandleRange.startCol, fillHandleRange.endCol);

    const undoEntries: UndoEntry[] = [];

    if (fillMaxR > srcMaxR) {
      // Fill down
      for (let c = srcMinC; c <= srcMaxC; c++) {
        const sourceVals: string[] = [];
        for (let r = srcMinR; r <= srcMaxR; r++) {
          sourceVals.push(deps.mergedCells[cellRef(r, c)]?.value ?? "");
        }
        const series = detectSeries(sourceVals);
        for (let r = srcMaxR + 1; r <= fillMaxR; r++) {
          const ref = cellRef(r, c);
          if (deps.readOnlyCells.has(ref)) continue;
          const before = deps.mergedCells[ref] ?? { value: "" };
          let newValue: string;
          if (series.type === "formula") {
            const srcFormula =
              sourceVals[(r - srcMaxR - 1) % sourceVals.length];
            newValue = adjustFormulaRefs(
              srcFormula,
              r - srcMinR - ((r - srcMaxR - 1) % sourceVals.length),
              0,
            );
          } else {
            newValue = generateFillValue(sourceVals, r - srcMaxR - 1);
          }
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          deps.setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          deps.onCellChange(ref, after);
        }
      }
    } else if (fillMinR < srcMinR) {
      // Fill up
      for (let c = srcMinC; c <= srcMaxC; c++) {
        const sourceVals: string[] = [];
        for (let r = srcMaxR; r >= srcMinR; r--) {
          sourceVals.push(deps.mergedCells[cellRef(r, c)]?.value ?? "");
        }
        const series = detectSeries(sourceVals);
        for (let r = srcMinR - 1; r >= fillMinR; r--) {
          const ref = cellRef(r, c);
          if (deps.readOnlyCells.has(ref)) continue;
          const before = deps.mergedCells[ref] ?? { value: "" };
          let newValue: string;
          if (series.type === "formula") {
            const srcFormula =
              sourceVals[(srcMinR - 1 - r) % sourceVals.length];
            newValue = adjustFormulaRefs(
              srcFormula,
              r - srcMaxR + ((srcMinR - 1 - r) % sourceVals.length),
              0,
            );
          } else {
            newValue = generateFillValue(sourceVals, srcMinR - 1 - r);
          }
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          deps.setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          deps.onCellChange(ref, after);
        }
      }
    } else if (fillMaxC > srcMaxC) {
      // Fill right
      for (let r = srcMinR; r <= srcMaxR; r++) {
        const sourceVals: string[] = [];
        for (let c = srcMinC; c <= srcMaxC; c++) {
          sourceVals.push(deps.mergedCells[cellRef(r, c)]?.value ?? "");
        }
        const series = detectSeries(sourceVals);
        for (let c = srcMaxC + 1; c <= fillMaxC; c++) {
          const ref = cellRef(r, c);
          if (deps.readOnlyCells.has(ref)) continue;
          const before = deps.mergedCells[ref] ?? { value: "" };
          let newValue: string;
          if (series.type === "formula") {
            const srcFormula =
              sourceVals[(c - srcMaxC - 1) % sourceVals.length];
            newValue = adjustFormulaRefs(
              srcFormula,
              0,
              c - srcMinC - ((c - srcMaxC - 1) % sourceVals.length),
            );
          } else {
            newValue = generateFillValue(sourceVals, c - srcMaxC - 1);
          }
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          deps.setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          deps.onCellChange(ref, after);
        }
      }
    } else if (fillMinC < srcMinC) {
      // Fill left
      for (let r = srcMinR; r <= srcMaxR; r++) {
        const sourceVals: string[] = [];
        for (let c = srcMaxC; c >= srcMinC; c--) {
          sourceVals.push(deps.mergedCells[cellRef(r, c)]?.value ?? "");
        }
        const series = detectSeries(sourceVals);
        for (let c = srcMinC - 1; c >= fillMinC; c--) {
          const ref = cellRef(r, c);
          if (deps.readOnlyCells.has(ref)) continue;
          const before = deps.mergedCells[ref] ?? { value: "" };
          let newValue: string;
          if (series.type === "formula") {
            const srcFormula =
              sourceVals[(srcMinC - 1 - c) % sourceVals.length];
            newValue = adjustFormulaRefs(
              srcFormula,
              0,
              c - srcMaxC + ((srcMinC - 1 - c) % sourceVals.length),
            );
          } else {
            newValue = generateFillValue(sourceVals, srcMinC - 1 - c);
          }
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          deps.setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          deps.onCellChange(ref, after);
        }
      }
    }

    if (undoEntries.length > 0) {
      deps.undoHistory.pushBatch(undoEntries);
    }

    deps.setSelectionRange({
      startRow: fillMinR,
      startCol: fillMinC,
      endRow: fillMaxR,
      endCol: fillMaxC,
    });

    setFillHandleActive(false);
    setFillHandleRange(null);
  }

  return {
    fillHandleActive,
    fillHandleRange,
    handleFillHandleStart,
    handleFillHandleDrag,
    handleFillHandleEnd,
  };
}
