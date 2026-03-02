"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { NumberFormat } from "./number-format";
import type {
  CellData,
  CellMap,
  ColumnWidths,
  ContextMenuState,
} from "./spreadsheet-types";

export interface SpreadsheetContextValue {
  // Cell data
  cells: CellMap;
  onCellChange: (ref: string, data: CellData) => void;

  // Selection
  selectedCell: string;
  setSelectedCell: (ref: string) => void;
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  setSelectionRange: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;

  // Editing
  editingValue: string;
  setEditingValue: (val: string) => void;

  // Zoom
  zoom: number;
  setZoom: (z: number) => void;

  // Formatting state (reflects active cell)
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontSize: string;
  fontFamily: string;

  // Formatting actions
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onFontSizeChange: (size: string) => void;
  onFontFamilyChange: (family: string) => void;

  // Color
  onFillColor: (color: string | null) => void;
  onTextColor: (color: string | null) => void;

  // Number format
  numberFormat: NumberFormat;
  onNumberFormatChange: (format: NumberFormat) => void;

  // Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;

  // Read-only cells
  readOnlyCells: Set<string>;

  // Column count
  columnCount: number;
  onAddColumn: () => void;
  onDeleteLastColumn: () => void;

  // Row count
  rowCount: number;
  onAddRow: () => void;
  onDeleteLastRow: () => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // Column widths
  columnWidths: ColumnWidths;
  setColumnWidth: (col: number, width: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Context menu
  contextMenu: ContextMenuState | null;
  setContextMenu: (state: ContextMenuState | null) => void;

  // Column filters
  columnFilters: Record<number, Set<string>>;
  setColumnFilter: (col: number, values: Set<string> | null) => void;
  clearAllFilters: () => void;
  filteredRowIndices: Set<number> | null;
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function useSpreadsheet() {
  const ctx = useContext(SpreadsheetContext);
  if (!ctx)
    throw new Error("useSpreadsheet must be used within SpreadsheetProvider");
  return ctx;
}

export function SpreadsheetProvider({
  value,
  children,
}: {
  value: SpreadsheetContextValue;
  children: ReactNode;
}) {
  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  );
}
