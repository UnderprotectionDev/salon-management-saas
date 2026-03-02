"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCellDisplay } from "../lib/number-format";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { evalFormula } from "../lib/spreadsheet-formula";
import { GRID } from "../lib/spreadsheet-types";
import { cellRef, colLabel } from "../lib/spreadsheet-utils";
import { CellDropdown } from "./CellDropdown";
import { ColumnFilterPopover } from "./ColumnFilterPopover";
import { ColumnResizeHandle } from "./ColumnResizeHandle";
import { GridContextMenu } from "./GridContextMenu";

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
  } = useSpreadsheet();

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [dropdownCell, setDropdownCell] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    // If dropdown cell, open dropdown instead
    const cellData = cells[ref];
    if (cellData?.cellType === "dropdown" && cellData.dropdownOptions) {
      setDropdownCell(ref);
      return;
    }
    pendingInitialValue.current = initialValue;
    setEditingCell(ref);
    setEditingValue(initialValue ?? cells[ref]?.value ?? "");
  }

  function handleCellMouseDown(row: number, col: number) {
    const ref = cellRef(row, col);
    if (editingCell && editingCell !== ref) commitEdit();
    setDropdownCell(null);
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
    const up = () => setIsDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

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
    if (mod && e.key === "v") {
      e.preventDefault();
      pasteSelection();
      return;
    }
    if (mod && e.key === "f") {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }

    if (editingCell) return;
    const { row, col } = getSelectedCoords();

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
      startEditing(selectedCell, e.key);
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
                  borderRight: "1px solid var(--sheet-grid)",
                  userSelect: "none",
                  letterSpacing: "0.05em",
                  position: "relative",
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

        {/* Rows */}
        {Array.from({ length: rowCount }, (_, r) => {
          // Skip filtered rows (but always show header row 0)
          if (r > 0 && filteredRowIndices && !filteredRowIndices.has(r)) {
            return null;
          }

          const isRowActive = r >= selMinRow && r <= selMaxRow;
          const isLastRow = r === rowCount - 1;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed row grid
            <div key={r} style={{ display: "flex", height: GRID.ROW_HEIGHT }}>
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
                  borderBottom: "1px solid var(--sheet-grid)",
                  zIndex: 10,
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

                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet cells need mouse handlers
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed column grid
                    key={c}
                    style={{
                      width: colW,
                      height: GRID.ROW_HEIGHT,
                      flexShrink: 0,
                      position: "relative",
                      background:
                        isInRange && !isSingleSelected
                          ? "var(--sheet-selection)"
                          : (cellData?.bgColor ?? "var(--sheet-cell-bg)"),
                      borderRight: "1px solid var(--sheet-grid)",
                      borderBottom: "1px solid var(--sheet-grid)",
                      outline: isSingleSelected
                        ? "2px solid var(--sheet-active-ring)"
                        : "none",
                      outlineOffset: "-2px",
                      zIndex: isSingleSelected ? 5 : 0,
                      cursor: "cell",
                      overflow: "hidden",
                      userSelect: "none",
                    }}
                    onMouseDown={() => handleCellMouseDown(r, c)}
                    onMouseEnter={() => handleCellMouseEnter(r, c)}
                    onDoubleClick={() => startEditing(ref)}
                    onContextMenu={(e) => handleContextMenu(e, r, c)}
                  >
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
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
                    ) : isDropdown ? (
                      <CellDropdown
                        options={cellData.dropdownOptions!}
                        currentLabel={cellData.value}
                        onSelect={(val) => {
                          // Find label for the selected value
                          const opt = cellData.dropdownOptions!.find(
                            (o) => o.value === val,
                          );
                          const label = opt?.label ?? val;
                          const existing = cells[ref] || { value: "" };
                          onCellChange(ref, { ...existing, value: label });
                          setDropdownCell(null);
                          // Move to next cell
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
                          lineHeight: `${GRID.ROW_HEIGHT}px`,
                          fontSize: `${cellData?.fontSize ?? 12}px`,
                          fontFamily: cellData?.fontFamily ?? "inherit",
                          fontWeight: cellData?.bold ? 600 : 400,
                          fontStyle: cellData?.italic ? "italic" : "normal",
                          textDecoration: cellData?.underline
                            ? "underline"
                            : "none",
                          textAlign: cellData?.align ?? "left",
                          color: cellData?.textColor ?? "var(--foreground)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {displayValue}
                        {/* Dropdown indicator */}
                        {cellData?.cellType === "dropdown" && (
                          <ChevronDown
                            className="inline-block ml-0.5 size-3 text-muted-foreground align-middle"
                            style={{ marginTop: -2 }}
                          />
                        )}
                      </span>
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
      </div>

      {/* Context menu */}
      {contextMenu && (
        <GridContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          isReadOnlyTab={false}
          isHeaderRow={contextMenu.row === 0}
          isTotalRow={false}
          canInsertRow={false}
          canDeleteRow={false}
          onCopy={copySelection}
          onCut={cutSelection}
          onPaste={pasteSelection}
          onClearCell={() => {
            if (!readOnlyCells.has(contextMenu.cellRef)) {
              const existing = cells[contextMenu.cellRef] || { value: "" };
              onCellChange(contextMenu.cellRef, { ...existing, value: "" });
            }
          }}
          onInsertRowAbove={() => {}}
          onInsertRowBelow={() => {}}
          onDeleteRow={() => {}}
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
        />
      )}
    </div>
  );
}
