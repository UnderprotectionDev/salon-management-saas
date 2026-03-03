"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { evaluateConditionalFormats } from "../lib/conditional-format-engine";
import { adjustFormulaRefs } from "../lib/fill-series";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import { getAllFormulaNames } from "../lib/formulas";
import { isMergeHiddenCell, isMergePrimaryCell } from "../lib/merge-utils";
import { formatCellDisplay } from "../lib/number-format";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { evalFormula } from "../lib/spreadsheet-formula";
import { GRID } from "../lib/spreadsheet-types";
import { cellRef, colLabel } from "../lib/spreadsheet-utils";
import { validateCell } from "../lib/validation-engine";
import { CellAutocomplete, useAutocompleteKeyboard } from "./CellAutocomplete";
import { CellDropdown } from "./CellDropdown";
import { ColumnFilterPopover } from "./ColumnFilterPopover";
import { ColumnResizeHandle } from "./ColumnResizeHandle";
import { FormulaQuickBar } from "./FormulaQuickBar";
import { GridContextMenu } from "./GridContextMenu";
import { PasteSpecialMenu } from "./PasteSpecialMenu";

const FORMULA_FUNCTIONS = getAllFormulaNames();

export function SpreadsheetGrid() {
  const {
    cells,
    onCellChange,
    selectedCell,
    setSelectedCell,
    selectionRange,
    setSelectionRange,
    editingValue,
    setEditingValue,
    readOnlyCells,
    copySelection,
    cutSelection,
    pasteSelection,
    setSearchOpen,
    columnCount,
    onAddColumn,
    onDeleteLastColumn,
    rowCount,
    onAddRow,
    onDeleteLastRow,
    columnWidths,
    setColumnWidth,
    undo,
    redo,
    contextMenu,
    setContextMenu,
    columnFilters,
    setColumnFilter,
    filteredRowIndices,
    // Formula mode
    isFormulaMode,
    insertCellRefInFormula,
    insertRangeRefInFormula,
    formulaRefHighlights,
    setFormulaCursorPos,
    // Row/Column operations
    insertRowAbove,
    insertRowBelow,
    deleteRow,
    insertColumnLeft,
    insertColumnRight,
    deleteColumn,
    // Fill handle
    fillHandleActive,
    fillHandleRange,
    onFillHandleStart,
    onFillHandleDrag,
    onFillHandleEnd,
    // Paste special
    pasteSpecial,
    // Freeze
    freezeRow,
    freezeCol,
    // Merge
    mergedRegions,
    // Validation
    openValidationDialog,
    // Conditional formatting
    conditionalFormats,
  } = useSpreadsheet();

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [dropdownCell, setDropdownCell] = useState<string | null>(null);
  const [pasteSpecialPos, setPasteSpecialPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  // Track if we're in formula-mode drag (for range ref insertion)
  const [formulaDragStart, setFormulaDragStart] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Formula autocomplete
  function getFormulaPrefix(): string {
    if (!editingValue.startsWith("=")) return "";
    // Get the last token after ( or , or operator
    const expr = editingValue.slice(1);
    const lastTokenMatch = expr.match(/([A-Z]+)$/i);
    return lastTokenMatch ? lastTokenMatch[1].toUpperCase() : "";
  }

  const formulaPrefix = getFormulaPrefix();

  const autocomplete = useAutocompleteKeyboard(
    FORMULA_FUNCTIONS,
    formulaPrefix,
    (selected) => {
      // Replace the partial token with the function name + (
      const expr = editingValue;
      const lastTokenMatch = expr.match(/([A-Z]+)$/i);
      if (lastTokenMatch) {
        const newVal =
          expr.slice(0, expr.length - lastTokenMatch[1].length) +
          selected +
          "(";
        setEditingValue(newVal);
      }
    },
  );

  function getColWidth(c: number): number {
    return columnWidths[c] ?? GRID.DEFAULT_COL_WIDTH;
  }

  function getTotalWidth(): number {
    let total = GRID.ROW_HEADER_WIDTH;
    for (let c = 0; c < columnCount; c++) {
      total += getColWidth(c);
    }
    return total;
  }

  function getSelectedCoords(): { row: number; col: number } {
    const m = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!m) return { row: 0, col: 0 };
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    return { row: Number.parseInt(m[2], 10) - 1, col: col - 1 };
  }

  function isCellInSelection(row: number, col: number): boolean {
    if (!selectionRange) return false;
    const { startRow, startCol, endRow, endCol } = selectionRange;
    return (
      row >= Math.min(startRow, endRow) &&
      row <= Math.max(startRow, endRow) &&
      col >= Math.min(startCol, endCol) &&
      col <= Math.max(startCol, endCol)
    );
  }

  function isCellInFillRange(row: number, col: number): boolean {
    if (!fillHandleRange || !fillHandleActive) return false;
    const { startRow, startCol, endRow, endCol } = fillHandleRange;
    return (
      row >= Math.min(startRow, endRow) &&
      row <= Math.max(startRow, endRow) &&
      col >= Math.min(startCol, endCol) &&
      col <= Math.max(startCol, endCol)
    );
  }

  function commitEdit() {
    if (editingCell) {
      const existing = cells[editingCell] || { value: "" };
      onCellChange(editingCell, { ...existing, value: editingValue });
      setEditingCell(null);
    }
  }

  function cancelEdit() {
    if (editingCell) {
      setEditingValue(cells[editingCell]?.value ?? "");
      setEditingCell(null);
    }
  }

  // Bug B fix: use useEffect to focus edit input after React commit
  const pendingInitialValue = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      if (pendingInitialValue.current !== undefined) {
        const len = pendingInitialValue.current.length;
        editInputRef.current.setSelectionRange(len, len);
      } else {
        editInputRef.current.select();
      }
      pendingInitialValue.current = undefined;
    }
  }, [editingCell]);

  function startEditing(ref: string, initialValue?: string) {
    if (readOnlyCells.has(ref)) return;
    const cellData = cells[ref];
    if (cellData?.cellType === "dropdown" && cellData.dropdownOptions) {
      setDropdownCell(ref);
      return;
    }
    pendingInitialValue.current = initialValue;
    setEditingCell(ref);
    setEditingValue(initialValue ?? cells[ref]?.value ?? "");
  }

  function handleCellMouseDown(row: number, col: number, e?: React.MouseEvent) {
    const ref = cellRef(row, col);

    // Formula mode: insert reference instead of selecting
    if (isFormulaMode && editingCell) {
      e?.preventDefault();
      insertCellRefInFormula(ref);
      setFormulaDragStart({ row, col });
      return;
    }

    if (editingCell && editingCell !== ref) commitEdit();
    setDropdownCell(null);

    // Shift+Click: extend selection
    if (e?.shiftKey) {
      const { row: selRow, col: selCol } = getSelectedCoords();
      setSelectionRange({
        startRow: selRow,
        startCol: selCol,
        endRow: row,
        endCol: col,
      });
      containerRef.current?.focus();
      return;
    }

    setSelectedCell(ref);
    setDragStart({ row, col });
    setIsDragging(true);
    setSelectionRange({
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    });
    containerRef.current?.focus();
  }

  function handleCellMouseEnter(row: number, col: number) {
    // Fill handle dragging
    if (fillHandleActive) {
      onFillHandleDrag(row, col);
      return;
    }

    // Formula mode dragging for range ref
    if (isFormulaMode && formulaDragStart) {
      const startRef = cellRef(formulaDragStart.row, formulaDragStart.col);
      const endRef = cellRef(row, col);
      if (startRef !== endRef) {
        insertRangeRefInFormula(startRef, endRef);
      }
      return;
    }

    if (isDragging && dragStart) {
      setSelectionRange({
        startRow: dragStart.row,
        startCol: dragStart.col,
        endRow: row,
        endCol: col,
      });
    }
  }

  function handleContextMenu(e: React.MouseEvent, row: number, col: number) {
    e.preventDefault();
    const ref = cellRef(row, col);
    setSelectedCell(ref);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      row,
      col,
      cellRef: ref,
    });
  }

  useEffect(() => {
    const up = () => {
      setIsDragging(false);
      setFormulaDragStart(null);
      if (fillHandleActive) {
        onFillHandleEnd();
      }
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [fillHandleActive, onFillHandleEnd]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;

    // Undo/Redo
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    // Clipboard
    if (mod && e.key === "c") {
      e.preventDefault();
      copySelection();
      return;
    }
    if (mod && e.key === "x") {
      e.preventDefault();
      cutSelection();
      return;
    }
    if (mod && e.key === "v" && !e.shiftKey) {
      e.preventDefault();
      pasteSelection();
      return;
    }
    // Paste Special: Ctrl+Shift+V
    if (mod && e.key === "v" && e.shiftKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      setPasteSpecialPos({
        x: (rect?.left ?? 200) + 100,
        y: (rect?.top ?? 100) + 50,
      });
      return;
    }
    if (mod && e.key === "f") {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }

    // Ctrl+D: Fill Down
    if (mod && e.key === "d" && !e.shiftKey) {
      e.preventDefault();
      handleFillDown();
      return;
    }
    // Ctrl+R: Fill Right
    if (mod && e.key === "r" && !e.shiftKey) {
      e.preventDefault();
      handleFillRight();
      return;
    }

    if (editingCell) {
      // If autocomplete is open, let it handle keys first
      if (autocomplete.handleKeyDown(e)) return;
      return;
    }

    const { row, col } = getSelectedCoords();

    // Shift+Arrow: extend selection range
    if (e.shiftKey && e.key.startsWith("Arrow")) {
      e.preventDefault();
      const sr = selectionRange ?? {
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      };
      if (e.key === "ArrowRight") {
        setSelectionRange({
          ...sr,
          endCol: Math.min(sr.endCol + 1, columnCount - 1),
        });
      } else if (e.key === "ArrowLeft") {
        setSelectionRange({ ...sr, endCol: Math.max(sr.endCol - 1, 0) });
      } else if (e.key === "ArrowDown") {
        setSelectionRange({
          ...sr,
          endRow: Math.min(sr.endRow + 1, rowCount - 1),
        });
      } else if (e.key === "ArrowUp") {
        setSelectionRange({ ...sr, endRow: Math.max(sr.endRow - 1, 0) });
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedCell(cellRef(row, Math.min(col + 1, columnCount - 1)));
      setSelectionRange(null);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedCell(cellRef(row, Math.max(col - 1, 0)));
      setSelectionRange(null);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedCell(cellRef(Math.min(row + 1, rowCount - 1), col));
      setSelectionRange(null);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCell(cellRef(Math.max(row - 1, 0), col));
      setSelectionRange(null);
    } else if (e.key === "Enter") {
      e.preventDefault();
      setSelectedCell(cellRef(Math.min(row + 1, rowCount - 1), col));
      setSelectionRange(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      setSelectedCell(cellRef(row, Math.min(col + 1, columnCount - 1)));
      setSelectionRange(null);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (!readOnlyCells.has(selectedCell)) {
        const existing = cells[selectedCell] || { value: "" };
        onCellChange(selectedCell, { ...existing, value: "" });
        setEditingValue("");
      }
    } else if (e.key === "F2") {
      startEditing(selectedCell);
    } else if (
      e.key === "=" ||
      (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
    ) {
      e.preventDefault();
      startEditing(selectedCell, e.key);
    }
  }

  // Fill Down: copy top row of selection to all rows below
  function handleFillDown() {
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

  // Fill Right: copy left column of selection to all columns right
  function handleFillRight() {
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

  const { row: selRow, col: selCol } = getSelectedCoords();
  const selMinRow = selectionRange
    ? Math.min(selectionRange.startRow, selectionRange.endRow)
    : selRow;
  const selMaxRow = selectionRange
    ? Math.max(selectionRange.startRow, selectionRange.endRow)
    : selRow;
  const selMinCol = selectionRange
    ? Math.min(selectionRange.startCol, selectionRange.endCol)
    : selCol;
  const selMaxCol = selectionRange
    ? Math.max(selectionRange.startCol, selectionRange.endCol)
    : selCol;

  // Compute cumulative column offsets for freeze panes
  function getColLeft(c: number): number {
    let left = 0;
    for (let i = 0; i < c; i++) left += getColWidth(i);
    return left;
  }

  // Compute cumulative column offsets for freeze panes (used above in getColLeft)

  // Row virtualization — build visible row indices (excluding frozen rows)
  const visibleRowIndices: number[] = [];
  for (let r = freezeRow; r < rowCount; r++) {
    if (r > 0 && filteredRowIndices && !filteredRowIndices.has(r)) continue;
    visibleRowIndices.push(r);
  }

  const rowVirtualizer = useVirtualizer({
    count: visibleRowIndices.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => GRID.ROW_HEIGHT,
    overscan: 10,
  });

  const frozenRowsHeight = freezeRow * GRID.ROW_HEIGHT;

  // Pre-compute rows to render: frozen (sticky) + virtual (absolute)
  const rowsToRender: { r: number; style: React.CSSProperties }[] = [];
  for (let r = 0; r < freezeRow; r++) {
    if (r > 0 && filteredRowIndices && !filteredRowIndices.has(r)) continue;
    rowsToRender.push({
      r,
      style: {
        display: "flex",
        height: GRID.ROW_HEIGHT,
        width: getTotalWidth(),
        position: "sticky",
        top: GRID.COL_HEADER_HEIGHT + r * GRID.ROW_HEIGHT,
        zIndex: 15,
        overflow: "visible",
      },
    });
  }
  for (const virtualRow of rowVirtualizer.getVirtualItems()) {
    const r = visibleRowIndices[virtualRow.index];
    rowsToRender.push({
      r,
      style: {
        position: "absolute",
        top: GRID.COL_HEADER_HEIGHT + frozenRowsHeight + virtualRow.start,
        left: 0,
        display: "flex",
        height: GRID.ROW_HEIGHT,
        width: getTotalWidth(),
        overflow: "visible",
      },
    });
  }

  const totalHeight =
    GRID.COL_HEADER_HEIGHT +
    frozenRowsHeight +
    rowVirtualizer.getTotalSize() +
    (rowCount < GRID.MAX_ROWS ? GRID.ROW_HEIGHT : 0);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet grid needs keyboard/mouse interaction
    <div
      ref={containerRef}
      className="flex-1 w-full h-full overflow-auto outline-none"
      style={{ background: "var(--sheet-cell-bg)" }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: spreadsheet grid must be focusable for keyboard nav
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          position: "relative",
          width: getTotalWidth(),
          height: totalHeight,
        }}
      >
        {/* Column headers row (corner + column labels) */}
        <div
          style={{
            position: "sticky",
            top: 0,
            display: "flex",
            height: GRID.COL_HEADER_HEIGHT,
            zIndex: 20,
            background: "var(--sheet-header)",
            borderBottom: "1px solid var(--sheet-grid)",
          }}
        >
          {/* Corner cell */}
          <div
            style={{
              position: "sticky",
              left: 0,
              width: GRID.ROW_HEADER_WIDTH,
              height: GRID.COL_HEADER_HEIGHT,
              flexShrink: 0,
              zIndex: 30,
              background: "var(--sheet-header)",
              borderRight: "1px solid var(--sheet-grid)",
            }}
          />
          {Array.from({ length: columnCount }, (_, c) => {
            const isActive = c >= selMinCol && c <= selMaxCol;
            const isLastCol = c === columnCount - 1;
            const colW = getColWidth(c);
            const isFrozenCol = c < freezeCol;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed column headers
                key={c}
                className="group/colhdr"
                onMouseDown={() => {
                  if (editingCell) commitEdit();
                  setSelectedCell(cellRef(0, c));
                  setSelectionRange({
                    startRow: 0,
                    startCol: c,
                    endRow: rowCount - 1,
                    endCol: c,
                  });
                  containerRef.current?.focus();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    row: -1, // -1 indicates column header
                    col: c,
                    cellRef: colLabel(c),
                  });
                }}
                style={{
                  width: colW,
                  height: GRID.COL_HEADER_HEIGHT,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive
                    ? "var(--sheet-header-active)"
                    : "var(--sheet-header)",
                  color: isActive ? "white" : "var(--muted-foreground)",
                  borderRight:
                    c === freezeCol - 1
                      ? "2px solid var(--sheet-active-ring)"
                      : "1px solid var(--sheet-grid)",
                  userSelect: "none",
                  letterSpacing: "0.05em",
                  position: isFrozenCol ? "sticky" : "relative",
                  left: isFrozenCol
                    ? GRID.ROW_HEADER_WIDTH + getColLeft(c)
                    : undefined,
                  zIndex: isFrozenCol ? 25 : undefined,
                  cursor: "pointer",
                }}
              >
                {colLabel(c)}
                {/* Column filter icon */}
                <ColumnFilterPopover
                  col={c}
                  cells={cells}
                  rowCount={rowCount}
                  activeFilter={columnFilters[c]}
                  onFilterChange={setColumnFilter}
                />
                {/* Column resize handle */}
                <ColumnResizeHandle
                  col={c}
                  currentWidth={colW}
                  onResize={setColumnWidth}
                />
                {isLastCol && columnCount > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLastColumn();
                    }}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 hidden group-hover/colhdr:flex items-center justify-center size-3.5 rounded-sm bg-destructive/80 text-white hover:bg-destructive"
                    title="Remove last column"
                  >
                    <X className="size-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          {columnCount < GRID.MAX_COLS && (
            <button
              type="button"
              onClick={onAddColumn}
              style={{
                width: GRID.COL_HEADER_HEIGHT,
                height: GRID.COL_HEADER_HEIGHT,
                flexShrink: 0,
              }}
              className="flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 border-r border-b"
              title="Add column"
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>

        {/* Rows (frozen + virtualized) */}
        {rowsToRender.map(({ r, style: rowStyle }) => {
          const isRowActive = r >= selMinRow && r <= selMaxRow;
          const isLastRow = r === rowCount - 1;
          const isFrozenRow = r < freezeRow;
          return (
            <div key={r} style={rowStyle}>
              {/* Row number header */}
              <div
                className="group/rowhdr"
                onMouseDown={() => {
                  if (editingCell) commitEdit();
                  setSelectedCell(cellRef(r, 0));
                  setSelectionRange({
                    startRow: r,
                    startCol: 0,
                    endRow: r,
                    endCol: columnCount - 1,
                  });
                  containerRef.current?.focus();
                }}
                style={{
                  position: "sticky",
                  left: 0,
                  width: GRID.ROW_HEADER_WIDTH,
                  height: GRID.ROW_HEIGHT,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: "8px",
                  fontSize: "11px",
                  fontWeight: isRowActive ? 600 : 400,
                  background: isRowActive
                    ? "var(--sheet-header-active)"
                    : "var(--sheet-header)",
                  color: isRowActive ? "white" : "var(--muted-foreground)",
                  borderRight: "1px solid var(--sheet-grid)",
                  borderBottom:
                    r === freezeRow - 1
                      ? "2px solid var(--sheet-active-ring)"
                      : "1px solid var(--sheet-grid)",
                  zIndex: isFrozenRow ? 16 : 10,
                  userSelect: "none",
                  cursor: "pointer",
                }}
              >
                {r + 1}
                {isLastRow && rowCount > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLastRow();
                    }}
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 hidden group-hover/rowhdr:flex items-center justify-center size-3.5 rounded-sm bg-destructive/80 text-white hover:bg-destructive"
                    title="Remove last row"
                  >
                    <X className="size-2.5" />
                  </button>
                )}
              </div>

              {/* Cells */}
              {Array.from({ length: columnCount }, (_, c) => {
                // Hidden merged cells → invisible placeholder to preserve flex layout
                if (isMergeHiddenCell(r, c, mergedRegions)) {
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed column grid
                      key={c}
                      style={{
                        width: getColWidth(c),
                        height: GRID.ROW_HEIGHT,
                        flexShrink: 0,
                        borderRight: "none",
                        borderBottom: "none",
                        visibility: "hidden",
                      }}
                    />
                  );
                }

                const ref = cellRef(r, c);
                const cellData = cells[ref];
                const isSingleSelected = selectedCell === ref;
                const isInRange = isCellInSelection(r, c);
                const isEditing = editingCell === ref;
                const isDropdown =
                  cellData?.cellType === "dropdown" && dropdownCell === ref;
                const rawDisplay = cellData?.value
                  ? cellData.value.startsWith("=")
                    ? evalFormula(cellData.value, cells)
                    : cellData.value
                  : "";
                const cellFormat = cellData?.numberFormat ?? "general";
                const displayValue =
                  cellFormat !== "general"
                    ? formatCellDisplay(rawDisplay, cellFormat)
                    : rawDisplay;
                const colW = getColWidth(c);

                // Check if this is a merge primary cell
                const mergeRegion = isMergePrimaryCell(r, c, mergedRegions);
                let mergeWidth = colW;
                let mergeHeight = GRID.ROW_HEIGHT;
                if (mergeRegion) {
                  mergeWidth = 0;
                  for (
                    let mc = mergeRegion.startCol;
                    mc <= mergeRegion.endCol;
                    mc++
                  ) {
                    mergeWidth += getColWidth(mc);
                  }
                  mergeHeight =
                    (mergeRegion.endRow - mergeRegion.startRow + 1) *
                    GRID.ROW_HEIGHT;
                }

                // Formula ref highlight
                const refHighlight = formulaRefHighlights.get(ref);

                // Fill handle preview border
                const inFillRange = isCellInFillRange(r, c) && !isInRange;

                // Validation
                const validationResult = cellData?.validationRule
                  ? validateCell(
                      rawDisplay,
                      cellData.validationRule,
                      cells,
                      ref,
                    )
                  : { valid: true };

                // Conditional formatting
                const condStyle =
                  conditionalFormats.length > 0
                    ? evaluateConditionalFormats(
                        ref,
                        cellData?.value ?? "",
                        conditionalFormats,
                        cells,
                      )
                    : null;

                // Frozen cell styling
                const isFrozenCol = c < freezeCol;
                const isFrozenCell = isFrozenRow || isFrozenCol;

                // Fill handle indicator: show on bottom-right of selection
                const showFillHandle =
                  !editingCell &&
                  r === selMaxRow &&
                  c === selMaxCol &&
                  !fillHandleActive;

                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet cells need mouse handlers
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed column grid
                    key={c}
                    style={{
                      width: mergeRegion ? mergeWidth : colW,
                      height: mergeRegion ? mergeHeight : GRID.ROW_HEIGHT,
                      flexShrink: 0,
                      position: isFrozenCol ? "sticky" : "relative",
                      left: isFrozenCol
                        ? GRID.ROW_HEADER_WIDTH + getColLeft(c)
                        : undefined,
                      zIndex: mergeRegion
                        ? isFrozenCol
                          ? 12
                          : 10
                        : isSingleSelected
                          ? 5
                          : isFrozenCol
                            ? 12
                            : 0,
                      background: inFillRange
                        ? "var(--sheet-selection)"
                        : isInRange && !isSingleSelected
                          ? "var(--sheet-selection)"
                          : (condStyle?.bgColor ??
                            cellData?.bgColor ??
                            "var(--sheet-cell-bg)"),
                      borderRight:
                        c === freezeCol - 1
                          ? "2px solid var(--sheet-active-ring)"
                          : "1px solid var(--sheet-grid)",
                      borderBottom:
                        r === freezeRow - 1
                          ? "2px solid var(--sheet-active-ring)"
                          : "1px solid var(--sheet-grid)",
                      outline: isSingleSelected
                        ? "2px solid var(--sheet-active-ring)"
                        : "none",
                      outlineOffset: "-2px",
                      cursor:
                        isFormulaMode && editingCell ? "crosshair" : "cell",
                      overflow: "hidden",
                      userSelect: "none",
                      boxShadow: refHighlight
                        ? `inset 0 0 0 2px ${refHighlight}`
                        : inFillRange
                          ? "inset 0 0 0 1px var(--sheet-active-ring)"
                          : !validationResult.valid
                            ? `inset 0 0 0 2px ${validationResult.warningOnly ? "#f59e0b" : "#ef4444"}`
                            : undefined,
                    }}
                    onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                    onMouseEnter={() => handleCellMouseEnter(r, c)}
                    onDoubleClick={() => startEditing(ref)}
                    onContextMenu={(e) => handleContextMenu(e, r, c)}
                    title={
                      !validationResult.valid
                        ? validationResult.message
                        : undefined
                    }
                  >
                    {isEditing ? (
                      <>
                        <input
                          ref={editInputRef}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onSelect={(e) => {
                            const input = e.target as HTMLInputElement;
                            setFormulaCursorPos(
                              input.selectionStart ?? editingValue.length,
                            );
                          }}
                          onKeyDown={(e) => {
                            // Autocomplete first
                            if (autocomplete.handleKeyDown(e)) return;
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const existing = cells[ref] || { value: "" };
                              onCellChange(ref, {
                                ...existing,
                                value: editingValue,
                              });
                              setEditingCell(null);
                              setSelectedCell(
                                cellRef(Math.min(r + 1, rowCount - 1), c),
                              );
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEdit();
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              const existing = cells[ref] || { value: "" };
                              onCellChange(ref, {
                                ...existing,
                                value: editingValue,
                              });
                              setEditingCell(null);
                              setSelectedCell(
                                cellRef(r, Math.min(c + 1, columnCount - 1)),
                              );
                            }
                          }}
                          onBlur={() => {
                            if (editingCell !== ref) return;
                            const existing = cells[ref] || { value: "" };
                            onCellChange(ref, {
                              ...existing,
                              value: editingValue,
                            });
                            setEditingCell(null);
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            padding: "0 4px",
                            fontSize: `${cellData?.fontSize ?? 12}px`,
                            fontFamily: cellData?.fontFamily ?? "inherit",
                            fontWeight: cellData?.bold ? 600 : 400,
                            fontStyle: cellData?.italic ? "italic" : "normal",
                            textDecoration: cellData?.underline
                              ? "underline"
                              : "none",
                            textAlign: cellData?.align ?? "left",
                            outline: "none",
                            border: "none",
                            background: "var(--sheet-cell-bg)",
                            zIndex: 20,
                            boxShadow: "var(--sheet-edit-shadow)",
                            color: editingValue.startsWith("=")
                              ? "var(--primary)"
                              : "var(--foreground)",
                          }}
                        />
                        {/* Formula autocomplete dropdown */}
                        {autocomplete.isOpen &&
                          editingValue.startsWith("=") && (
                            <CellAutocomplete
                              suggestions={FORMULA_FUNCTIONS}
                              inputValue={formulaPrefix}
                              onSelect={(selected) => {
                                const expr = editingValue;
                                const lastTokenMatch = expr.match(/([A-Z]+)$/i);
                                if (lastTokenMatch) {
                                  const newVal =
                                    expr.slice(
                                      0,
                                      expr.length - lastTokenMatch[1].length,
                                    ) +
                                    selected +
                                    "(";
                                  setEditingValue(newVal);
                                }
                              }}
                              onClose={() => {}}
                              style={{ top: GRID.ROW_HEIGHT, left: 0 }}
                            />
                          )}
                      </>
                    ) : isDropdown ? (
                      <CellDropdown
                        options={cellData.dropdownOptions!}
                        currentLabel={cellData.value}
                        onSelect={(val) => {
                          const opt = cellData.dropdownOptions!.find(
                            (o) => o.value === val,
                          );
                          const label = opt?.label ?? val;
                          const existing = cells[ref] || { value: "" };
                          onCellChange(ref, { ...existing, value: label });
                          setDropdownCell(null);
                          setSelectedCell(
                            cellRef(r, Math.min(c + 1, columnCount - 1)),
                          );
                        }}
                        onClose={() => setDropdownCell(null)}
                        style={{ top: GRID.ROW_HEIGHT, left: 0 }}
                      />
                    ) : (
                      <span
                        style={{
                          display: "block",
                          padding: "0 4px",
                          lineHeight: mergeRegion
                            ? `${mergeHeight}px`
                            : `${GRID.ROW_HEIGHT}px`,
                          fontSize: `${cellData?.fontSize ?? 12}px`,
                          fontFamily: cellData?.fontFamily ?? "inherit",
                          fontWeight:
                            condStyle?.bold || cellData?.bold ? 600 : 400,
                          fontStyle:
                            condStyle?.italic || cellData?.italic
                              ? "italic"
                              : "normal",
                          textDecoration: cellData?.underline
                            ? "underline"
                            : "none",
                          textAlign: cellData?.align ?? "left",
                          color:
                            condStyle?.textColor ??
                            cellData?.textColor ??
                            "var(--foreground)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          position: "relative",
                        }}
                      >
                        {/* Data bar background */}
                        {condStyle?.dataBarPercent !== undefined && (
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${condStyle.dataBarPercent}%`,
                              backgroundColor:
                                condStyle.dataBarColor ?? "#3b82f6",
                              opacity: 0.25,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                        {displayValue}
                        {cellData?.cellType === "dropdown" && (
                          <ChevronDown
                            className="inline-block ml-0.5 size-3 text-muted-foreground align-middle"
                            style={{ marginTop: -2 }}
                          />
                        )}
                      </span>
                    )}

                    {/* Validation error indicator (red/yellow triangle) */}
                    {!validationResult.valid && !isEditing && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          width: 0,
                          height: 0,
                          borderLeft: "6px solid transparent",
                          borderTop: `6px solid ${validationResult.warningOnly ? "#f59e0b" : "#ef4444"}`,
                          zIndex: 5,
                        }}
                      />
                    )}

                    {/* Fill handle (blue square at bottom-right of selection) */}
                    {showFillHandle && (
                      // biome-ignore lint/a11y/noStaticElementInteractions: fill handle drag
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onFillHandleStart();
                        }}
                        style={{
                          position: "absolute",
                          right: -3,
                          bottom: -3,
                          width: 6,
                          height: 6,
                          background: "var(--sheet-active-ring)",
                          cursor: "crosshair",
                          zIndex: 30,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Add row button */}
        {rowCount < GRID.MAX_ROWS && (
          <div style={{ display: "flex", height: GRID.ROW_HEIGHT }}>
            <button
              type="button"
              onClick={onAddRow}
              style={{
                position: "sticky",
                left: 0,
                width: GRID.ROW_HEADER_WIDTH,
                height: GRID.ROW_HEIGHT,
              }}
              className="flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 border-r border-b"
              title="Add row"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        )}

        {/* Formula Quick Bar — floating toolbar near selection */}
        <FormulaQuickBar
          selectionRange={selectionRange}
          columnWidths={columnWidths}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <GridContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          isReadOnlyTab={false}
          isHeaderRow={contextMenu.row === 0}
          isTotalRow={false}
          canInsertRow={rowCount < GRID.MAX_ROWS}
          canDeleteRow={rowCount > 1}
          canInsertColumn={columnCount < GRID.MAX_COLS}
          canDeleteColumn={columnCount > 1}
          onCopy={copySelection}
          onCut={cutSelection}
          onPaste={pasteSelection}
          onClearCell={() => {
            if (!readOnlyCells.has(contextMenu.cellRef)) {
              const existing = cells[contextMenu.cellRef] || { value: "" };
              onCellChange(contextMenu.cellRef, { ...existing, value: "" });
            }
          }}
          onInsertRowAbove={() => insertRowAbove(contextMenu.row)}
          onInsertRowBelow={() => insertRowBelow(contextMenu.row)}
          onDeleteRow={() => deleteRow(contextMenu.row)}
          onInsertColumnLeft={() => insertColumnLeft(contextMenu.col)}
          onInsertColumnRight={() => insertColumnRight(contextMenu.col)}
          onDeleteColumn={() => deleteColumn(contextMenu.col)}
          onSortAsc={() => {
            setSelectedCell(cellRef(1, contextMenu.col));
            setSelectionRange({
              startRow: 1,
              startCol: contextMenu.col,
              endRow: rowCount - 1,
              endCol: contextMenu.col,
            });
          }}
          onSortDesc={() => {
            setSelectedCell(cellRef(1, contextMenu.col));
            setSelectionRange({
              startRow: 1,
              startCol: contextMenu.col,
              endRow: rowCount - 1,
              endCol: contextMenu.col,
            });
          }}
          onFilterByColumn={() => {}}
          hasMultiCellSelection={
            !!selectionRange &&
            (Math.abs(selectionRange.startRow - selectionRange.endRow) > 0 ||
              Math.abs(selectionRange.startCol - selectionRange.endCol) > 0)
          }
          onCopyFormula={async (fn: FormulaFn) => {
            const formula = buildSelectionFormula(fn, selectionRange);
            if (!formula) return;
            const ok = await copyFormulaToClipboard(formula);
            if (ok) toast.success(`Copied ${formula}`);
          }}
          onDataValidation={() => openValidationDialog(contextMenu.cellRef)}
        />
      )}

      {/* Paste Special menu */}
      {pasteSpecialPos && (
        <PasteSpecialMenu
          x={pasteSpecialPos.x}
          y={pasteSpecialPos.y}
          onSelect={(mode) => {
            pasteSpecial(mode);
            setPasteSpecialPos(null);
          }}
          onClose={() => setPasteSpecialPos(null)}
        />
      )}
    </div>
  );
}
