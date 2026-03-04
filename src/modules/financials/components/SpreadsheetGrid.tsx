"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FORMULA_NAMES } from "../lib/formula-catalog";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import { handleGridKeyDown } from "../lib/grid-keyboard";
import { isMergeHiddenCell, isMergePrimaryCell } from "../lib/merge-utils";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { GRID } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";
import { useAutocompleteKeyboard } from "./CellAutocomplete";
import { FormulaQuickBar } from "./FormulaQuickBar";
import { GridColumnHeaders } from "./GridColumnHeaders";
import { GridContextMenu } from "./GridContextMenu";
import { PasteSpecialMenu } from "./PasteSpecialMenu";
import { SpreadsheetCell } from "./SpreadsheetCell";

const VIRTUALIZATION_BUFFER = 5;

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
    isFormulaMode,
    insertCellRefInFormula,
    insertRangeRefInFormula,
    formulaRefHighlights,
    setFormulaCursorPos,
    insertRowAbove,
    insertRowBelow,
    deleteRow,
    insertColumnLeft,
    insertColumnRight,
    deleteColumn,
    fillHandleActive,
    fillHandleRange,
    onFillHandleStart,
    onFillHandleDrag,
    onFillHandleEnd,
    pasteSpecial,
    freezeRow,
    freezeCol,
    mergedRegions,
    onOpenShortcuts,
    customFormulas,
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
  const [formulaDragStart, setFormulaDragStart] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const editInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Formula autocomplete
  function getFormulaPrefix(): string {
    if (!editingValue.startsWith("=")) return "";
    const expr = editingValue.slice(1);
    const lastTokenMatch = expr.match(/([A-Z]+)$/i);
    return lastTokenMatch ? lastTokenMatch[1].toUpperCase() : "";
  }

  const formulaPrefix = getFormulaPrefix();

  const autocomplete = useAutocompleteKeyboard(
    FORMULA_NAMES,
    formulaPrefix,
    (selected) => {
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
    if (columnCount < GRID.MAX_COLS) {
      total += GRID.COL_HEADER_HEIGHT;
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
    if (isFormulaMode && editingCell) {
      e?.preventDefault();
      insertCellRefInFormula(ref);
      setFormulaDragStart({ row, col });
      return;
    }
    if (editingCell && editingCell !== ref) commitEdit();
    setDropdownCell(null);
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
    if (fillHandleActive) {
      onFillHandleDrag(row, col);
      return;
    }
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    setContainerHeight(container.clientHeight);
    return () => observer.disconnect();
  }, []);

  // Keyboard handler using extracted pure function
  function onKeyDown(e: React.KeyboardEvent) {
    handleGridKeyDown(e, {
      editingCell,
      selectedCell,
      selectionRange,
      columnCount,
      rowCount,
      cells,
      readOnlyCells,
      undo,
      redo,
      copySelection,
      cutSelection,
      pasteSelection,
      setSearchOpen,
      onOpenShortcuts,
      setSelectedCell,
      setSelectionRange,
      setEditingValue,
      onCellChange,
      startEditing,
      commitEdit,
      getSelectedCoords,
      autocompleteHandleKeyDown: autocomplete.handleKeyDown,
      setPasteSpecialPos,
      containerRect: containerRef.current?.getBoundingClientRect() ?? null,
    });
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

  function getColLeft(c: number): number {
    let left = 0;
    for (let i = 0; i < c; i++) left += getColWidth(i);
    return left;
  }

  // Virtualization
  const frozenRowHeight = freezeRow * GRID.ROW_HEIGHT;
  const adjustedScrollTop = Math.max(
    0,
    scrollTop - GRID.COL_HEADER_HEIGHT - frozenRowHeight,
  );
  const visibleRowCount = Math.ceil(containerHeight / GRID.ROW_HEIGHT);
  const virtualStartRow = Math.max(
    freezeRow,
    Math.floor(adjustedScrollTop / GRID.ROW_HEIGHT) - VIRTUALIZATION_BUFFER,
  );
  const virtualEndRow = Math.min(
    rowCount - 1,
    virtualStartRow + visibleRowCount + VIRTUALIZATION_BUFFER * 2,
  );

  function handleAutocompleteSelect(selected: string) {
    const expr = editingValue;
    const lastTokenMatch = expr.match(/([A-Z]+)$/i);
    if (lastTokenMatch) {
      const newVal = `${expr.slice(0, expr.length - lastTokenMatch[1].length)}${selected}(`;
      setEditingValue(newVal);
    }
  }

  function handleCommitEdit(_ref: string) {
    commitEdit();
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet grid needs keyboard/mouse interaction
    <div
      ref={containerRef}
      className="flex-1 w-full h-full overflow-auto outline-none"
      style={{ background: "var(--sheet-cell-bg)" }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: spreadsheet grid must be focusable for keyboard nav
      tabIndex={0}
      onKeyDown={onKeyDown}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div
        style={{
          position: "relative",
          width: getTotalWidth(),
          height:
            GRID.COL_HEADER_HEIGHT +
            rowCount * GRID.ROW_HEIGHT +
            (rowCount < GRID.MAX_ROWS ? GRID.ROW_HEIGHT : 0),
        }}
      >
        {/* Column headers */}
        <GridColumnHeaders
          columnCount={columnCount}
          freezeCol={freezeCol}
          selMinCol={selMinCol}
          selMaxCol={selMaxCol}
          rowCount={rowCount}
          cells={cells}
          columnFilters={columnFilters}
          editingCell={editingCell}
          getColWidth={getColWidth}
          getColLeft={getColLeft}
          setColumnWidth={setColumnWidth}
          setColumnFilter={setColumnFilter}
          setSelectedCell={setSelectedCell}
          setSelectionRange={setSelectionRange}
          setContextMenu={setContextMenu}
          commitEdit={commitEdit}
          onAddColumn={onAddColumn}
          onDeleteLastColumn={onDeleteLastColumn}
          containerRef={containerRef}
        />

        {/* Frozen rows */}
        {Array.from({ length: freezeRow }, (_, r) => {
          if (r > 0 && filteredRowIndices && !filteredRowIndices.has(r))
            return null;
          const isRowActive = r >= selMinRow && r <= selMaxRow;
          const isLastRow = r === rowCount - 1;
          return (
            <div
              key={`frozen-row-${r}`}
              style={{
                display: "flex",
                height: GRID.ROW_HEIGHT,
                position: "sticky",
                top: GRID.COL_HEADER_HEIGHT + r * GRID.ROW_HEIGHT,
                zIndex: 15,
              }}
            >
              {renderRowHeader(r, isRowActive, isLastRow, true)}
              {renderRowCells(r, true)}
            </div>
          );
        })}

        {/* Virtual spacer */}
        {virtualStartRow > freezeRow && (
          <div
            style={{
              height: (virtualStartRow - freezeRow) * GRID.ROW_HEIGHT,
              position: "absolute",
              top: GRID.COL_HEADER_HEIGHT + virtualStartRow * GRID.ROW_HEIGHT,
              width: 1,
            }}
          />
        )}

        {/* Visible rows */}
        {Array.from(
          { length: Math.max(0, virtualEndRow - virtualStartRow + 1) },
          (_, i) => {
            const r = virtualStartRow + i;
            if (r < freezeRow) return null;
            if (r >= rowCount) return null;
            if (r > 0 && filteredRowIndices && !filteredRowIndices.has(r))
              return null;
            const isRowActive = r >= selMinRow && r <= selMaxRow;
            const isLastRow = r === rowCount - 1;
            return (
              <div
                key={`row-${r}`}
                style={{
                  display: "flex",
                  height: GRID.ROW_HEIGHT,
                  position: "absolute",
                  top: GRID.COL_HEADER_HEIGHT + r * GRID.ROW_HEIGHT,
                  left: 0,
                  width: "100%",
                }}
              >
                {renderRowHeader(r, isRowActive, isLastRow, false)}
                {renderRowCells(r, false)}
              </div>
            );
          },
        )}

        {/* Add row button */}
        {rowCount < GRID.MAX_ROWS && (
          <div
            style={{
              display: "flex",
              height: GRID.ROW_HEIGHT,
              position: "absolute",
              top: GRID.COL_HEADER_HEIGHT + rowCount * GRID.ROW_HEIGHT,
              left: 0,
            }}
          >
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

        <FormulaQuickBar
          selectionRange={selectionRange}
          columnWidths={columnWidths}
        />
      </div>

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
        />
      )}

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

  // --- Render helpers ---

  function renderRowHeader(
    r: number,
    isRowActive: boolean,
    isLastRow: boolean,
    isFrozenRow: boolean,
  ) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet row header
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
    );
  }

  function renderRowCells(r: number, isFrozenRow: boolean) {
    return Array.from({ length: columnCount }, (_, c) => {
      if (isMergeHiddenCell(r, c, mergedRegions)) return null;

      const ref = cellRef(r, c);
      const cellData = cells[ref];
      const isSingleSelected = selectedCell === ref;
      const isInRange = isCellInSelection(r, c);
      const isEditing = editingCell === ref;
      const isDropdown =
        cellData?.cellType === "dropdown" && dropdownCell === ref;
      const colW = getColWidth(c);

      const mergeRegion = isMergePrimaryCell(r, c, mergedRegions);
      let mergeWidth = colW;
      let mergeHeight = GRID.ROW_HEIGHT;
      if (mergeRegion) {
        mergeWidth = 0;
        for (let mc = mergeRegion.startCol; mc <= mergeRegion.endCol; mc++) {
          mergeWidth += getColWidth(mc);
        }
        mergeHeight =
          (mergeRegion.endRow - mergeRegion.startRow + 1) * GRID.ROW_HEIGHT;
      }

      const refHighlight = formulaRefHighlights.get(ref);
      const inFillRange = isCellInFillRange(r, c) && !isInRange;
      const isFrozenCol = c < freezeCol;
      const isFrozenCell = isFrozenRow || isFrozenCol;
      const showFillHandle =
        !editingCell && r === selMaxRow && c === selMaxCol && !fillHandleActive;

      return (
        <SpreadsheetCell
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed column grid
          key={c}
          row={r}
          col={c}
          cellRef={ref}
          cellData={cellData}
          cells={cells}
          isSelected={isSingleSelected}
          isInRange={isInRange}
          isEditing={isEditing}
          isDropdown={isDropdown}
          inFillRange={inFillRange}
          isFrozenCell={isFrozenCell}
          isFrozenCol={isFrozenCol}
          colWidth={colW}
          mergeRegion={mergeRegion}
          mergeWidth={mergeWidth}
          mergeHeight={mergeHeight}
          refHighlight={refHighlight}
          showFillHandle={showFillHandle}
          isFormulaMode={isFormulaMode}
          editingCell={editingCell}
          freezeRow={freezeRow}
          freezeCol={freezeCol}
          editingValue={editingValue}
          setEditingValue={setEditingValue}
          editInputRef={editInputRef}
          setFormulaCursorPos={setFormulaCursorPos}
          autocompleteIsOpen={autocomplete.isOpen}
          autocompleteSuggestions={FORMULA_NAMES}
          formulaPrefix={formulaPrefix}
          autocompleteHandleKeyDown={autocomplete.handleKeyDown}
          onMouseDown={(e) => handleCellMouseDown(r, c, e)}
          onMouseEnter={() => handleCellMouseEnter(r, c)}
          onDoubleClick={() => startEditing(ref)}
          onContextMenu={(e) => handleContextMenu(e, r, c)}
          onCommitEdit={handleCommitEdit}
          onCancelEdit={cancelEdit}
          onCellChange={onCellChange}
          onSelectCell={setSelectedCell}
          onAutocompleteSelect={handleAutocompleteSelect}
          onDropdownSelect={(val) => {
            const opt = cellData?.dropdownOptions?.find((o) => o.value === val);
            const label = opt?.label ?? val;
            const existing = cells[ref] || { value: "" };
            onCellChange(ref, { ...existing, value: label });
            setDropdownCell(null);
            setSelectedCell(cellRef(r, Math.min(c + 1, columnCount - 1)));
          }}
          onDropdownClose={() => setDropdownCell(null)}
          onFillHandleStart={onFillHandleStart}
          rowCount={rowCount}
          columnCount={columnCount}
          customFormulas={customFormulas}
        />
      );
    });
  }
}
