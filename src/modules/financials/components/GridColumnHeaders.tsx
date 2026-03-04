"use client";

import { Plus, X } from "lucide-react";
import type { CellMap, ContextMenuState } from "../lib/spreadsheet-types";
import { GRID } from "../lib/spreadsheet-types";
import { cellRef, colLabel } from "../lib/spreadsheet-utils";
import { ColumnFilterPopover } from "./ColumnFilterPopover";
import { ColumnResizeHandle } from "./ColumnResizeHandle";

interface GridColumnHeadersProps {
  columnCount: number;
  freezeCol: number;
  selMinCol: number;
  selMaxCol: number;
  rowCount: number;
  cells: CellMap;
  columnFilters: Record<number, Set<string>>;
  editingCell: string | null;
  getColWidth: (c: number) => number;
  getColLeft: (c: number) => number;
  setColumnWidth: (col: number, width: number) => void;
  setColumnFilter: (col: number, values: Set<string> | null) => void;
  setSelectedCell: (ref: string) => void;
  setSelectionRange: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;
  setContextMenu: (state: ContextMenuState | null) => void;
  commitEdit: () => void;
  onAddColumn: () => void;
  onDeleteLastColumn: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function GridColumnHeaders({
  columnCount,
  freezeCol,
  selMinCol,
  selMaxCol,
  rowCount,
  cells,
  columnFilters,
  editingCell,
  getColWidth,
  getColLeft,
  setColumnWidth,
  setColumnFilter,
  setSelectedCell,
  setSelectionRange,
  setContextMenu,
  commitEdit,
  onAddColumn,
  onDeleteLastColumn,
  containerRef,
}: GridColumnHeadersProps) {
  return (
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
          // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet column header
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
                row: -1,
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
            <ColumnFilterPopover
              col={c}
              cells={cells}
              rowCount={rowCount}
              activeFilter={columnFilters[c]}
              onFilterChange={setColumnFilter}
            />
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
  );
}
