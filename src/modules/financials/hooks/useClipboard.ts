import { useRef } from "react";
import type { CellData, CellMap } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";

interface UseClipboardDeps {
  getSelectionRefs: () => string[];
  getSelectedCoords: () => { row: number; col: number };
  mergedCells: CellMap;
  readOnlyCells: Set<string>;
  handleCellChange: (ref: string, data: CellData) => void;
}

export function useClipboard(deps: UseClipboardDeps) {
  const clipboardRef = useRef<{
    cells: Record<string, CellData>;
    cut: boolean;
  } | null>(null);

  function handleCopy() {
    const refs = deps.getSelectionRefs();
    const copied: Record<string, CellData> = {};
    for (const ref of refs) {
      if (deps.mergedCells[ref]) copied[ref] = { ...deps.mergedCells[ref] };
    }
    clipboardRef.current = { cells: copied, cut: false };

    const text = refs.map((r) => deps.mergedCells[r]?.value ?? "").join("\t");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function handleCut() {
    const refs = deps.getSelectionRefs();
    const copied: Record<string, CellData> = {};
    for (const ref of refs) {
      if (deps.mergedCells[ref]) copied[ref] = { ...deps.mergedCells[ref] };
    }
    clipboardRef.current = { cells: copied, cut: true };

    for (const ref of refs) {
      if (!deps.readOnlyCells.has(ref) && deps.mergedCells[ref]) {
        deps.handleCellChange(ref, { ...deps.mergedCells[ref], value: "" });
      }
    }

    const text = refs.map((r) => copied[r]?.value ?? "").join("\t");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  async function handlePaste() {
    // If internal clipboard has data, use it (preserves formatting)
    if (clipboardRef.current) {
      doPaste("all");
      return;
    }

    // Fallback: read plain text from system clipboard
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const { row: targetRow, col: targetCol } = deps.getSelectedCoords();
      const targetRef = cellRef(targetRow, targetCol);
      if (deps.readOnlyCells.has(targetRef)) return;
      const existing = deps.mergedCells[targetRef] ?? { value: "" };
      deps.handleCellChange(targetRef, { ...existing, value: text });
    } catch {
      // clipboard read denied — ignore
    }
  }

  function doPaste(mode: "all" | "values" | "format") {
    if (!clipboardRef.current) return;
    const { row: targetRow, col: targetCol } = deps.getSelectedCoords();
    const sourceRefs = Object.keys(clipboardRef.current.cells);
    if (sourceRefs.length === 0) return;

    let minRow = Number.MAX_SAFE_INTEGER;
    let minCol = Number.MAX_SAFE_INTEGER;
    for (const ref of sourceRefs) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) continue;
      let c = 0;
      for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
      minRow = Math.min(minRow, Number.parseInt(m[2], 10) - 1);
      minCol = Math.min(minCol, c - 1);
    }

    for (const [ref, data] of Object.entries(clipboardRef.current.cells)) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) continue;
      let c = 0;
      for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
      const r = Number.parseInt(m[2], 10) - 1;

      const newRow = targetRow + (r - minRow);
      const newCol = targetCol + (c - 1 - minCol);
      const newRef = cellRef(newRow, newCol);

      if (!deps.readOnlyCells.has(newRef)) {
        const existing = deps.mergedCells[newRef] ?? { value: "" };
        if (mode === "all") {
          deps.handleCellChange(newRef, { ...data });
        } else if (mode === "values") {
          deps.handleCellChange(newRef, { ...existing, value: data.value });
        } else if (mode === "format") {
          const { value: _v, ...format } = data;
          deps.handleCellChange(newRef, { ...existing, ...format });
        }
      }
    }

    if (clipboardRef.current.cut) {
      clipboardRef.current = null;
    }
  }

  return {
    handleCopy,
    handleCut,
    handlePaste,
    doPaste,
  };
}
