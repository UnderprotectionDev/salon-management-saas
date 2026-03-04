"use client";

import { ChevronDown } from "lucide-react";
import type { MergedRegion } from "../lib/merge-utils";
import { formatCellDisplay } from "../lib/number-format";
import { evalFormula } from "../lib/spreadsheet-formula";
import type { CellData, CellMap } from "../lib/spreadsheet-types";
import { GRID } from "../lib/spreadsheet-types";
import { CellAutocomplete } from "./CellAutocomplete";
import { CellDropdown } from "./CellDropdown";

interface SpreadsheetCellProps {
  row: number;
  col: number;
  cellRef: string;
  cellData: CellData | undefined;
  cells: CellMap;
  isSelected: boolean;
  isInRange: boolean;
  isEditing: boolean;
  isDropdown: boolean;
  inFillRange: boolean;
  isFrozenCell: boolean;
  isFrozenCol: boolean;
  colWidth: number;
  mergeRegion: MergedRegion | false | null;
  mergeWidth: number;
  mergeHeight: number;
  refHighlight: string | undefined;
  showFillHandle: boolean;
  isFormulaMode: boolean;
  editingCell: string | null;
  freezeRow: number;
  freezeCol: number;
  // Editing props
  editingValue: string;
  setEditingValue: (val: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  setFormulaCursorPos: (pos: number) => void;
  // Autocomplete
  autocompleteIsOpen: boolean;
  autocompleteSuggestions: string[];
  formulaPrefix: string;
  autocompleteHandleKeyDown: (e: React.KeyboardEvent) => boolean;
  // Callbacks
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCommitEdit: (ref: string) => void;
  onCancelEdit: () => void;
  onCellChange: (ref: string, data: CellData) => void;
  onSelectCell: (ref: string) => void;
  onAutocompleteSelect: (selected: string) => void;
  onDropdownSelect: (val: string) => void;
  onDropdownClose: () => void;
  onFillHandleStart: () => void;
  rowCount: number;
  columnCount: number;
  customFormulas?: Record<string, string>;
}

export function SpreadsheetCell({
  row,
  col,
  cellRef: ref,
  cellData,
  cells,
  isSelected,
  isInRange,
  isEditing,
  isDropdown,
  inFillRange,
  isFrozenCell,
  isFrozenCol: _isFrozenCol,
  colWidth,
  mergeRegion,
  mergeWidth,
  mergeHeight,
  refHighlight,
  showFillHandle,
  isFormulaMode,
  editingCell,
  freezeRow,
  freezeCol,
  editingValue,
  setEditingValue,
  editInputRef,
  setFormulaCursorPos,
  autocompleteIsOpen,
  autocompleteSuggestions,
  formulaPrefix,
  autocompleteHandleKeyDown,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onContextMenu,
  onCommitEdit,
  onCancelEdit,
  onCellChange,
  onSelectCell,
  onAutocompleteSelect,
  onDropdownSelect,
  onDropdownClose,
  onFillHandleStart,
  rowCount,
  columnCount,
  customFormulas,
}: SpreadsheetCellProps) {
  const rawDisplay = cellData?.value
    ? cellData.value.startsWith("=")
      ? evalFormula(cellData.value, cells, 0, customFormulas)
      : cellData.value
    : "";
  const cellFormat = cellData?.numberFormat ?? "general";
  const displayValue =
    cellFormat !== "general"
      ? formatCellDisplay(rawDisplay, cellFormat)
      : rawDisplay;

  const cellW = mergeRegion ? mergeWidth : colWidth;
  const cellH = mergeRegion ? mergeHeight : GRID.ROW_HEIGHT;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: spreadsheet cells need mouse handlers
    <div
      style={{
        width: cellW,
        height: cellH,
        flexShrink: 0,
        position: isFrozenCell ? "sticky" : "relative",
        zIndex: isFrozenCell ? (isSelected ? 13 : 12) : isSelected ? 5 : 0,
        background: inFillRange
          ? "var(--sheet-selection)"
          : isInRange && !isSelected
            ? "var(--sheet-selection)"
            : (cellData?.bgColor ?? "var(--sheet-cell-bg)"),
        borderRight:
          col === freezeCol - 1
            ? "2px solid var(--sheet-active-ring)"
            : "1px solid var(--sheet-grid)",
        borderBottom:
          row === freezeRow - 1
            ? "2px solid var(--sheet-active-ring)"
            : "1px solid var(--sheet-grid)",
        outline: isSelected ? "2px solid var(--sheet-active-ring)" : "none",
        outlineOffset: "-2px",
        cursor: isFormulaMode && editingCell ? "crosshair" : "cell",
        overflow: "hidden",
        userSelect: "none",
        boxShadow: refHighlight
          ? `inset 0 0 0 2px ${refHighlight}`
          : inFillRange
            ? "inset 0 0 0 1px var(--sheet-active-ring)"
            : undefined,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isEditing ? (
        <>
          <input
            ref={editInputRef}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onSelect={(e) => {
              const input = e.target as HTMLInputElement;
              setFormulaCursorPos(input.selectionStart ?? editingValue.length);
            }}
            onKeyDown={(e) => {
              if (autocompleteHandleKeyDown(e)) return;
              if (e.key === "Enter") {
                e.preventDefault();
                const existing = cells[ref] || { value: "" };
                onCellChange(ref, { ...existing, value: editingValue });
                onCommitEdit(ref);
                onSelectCell(_cellRef(Math.min(row + 1, rowCount - 1), col));
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit();
              } else if (e.key === "Tab") {
                e.preventDefault();
                const existing = cells[ref] || { value: "" };
                onCellChange(ref, { ...existing, value: editingValue });
                onCommitEdit(ref);
                onSelectCell(_cellRef(row, Math.min(col + 1, columnCount - 1)));
              }
            }}
            onBlur={() => {
              if (editingCell !== ref) return;
              const existing = cells[ref] || { value: "" };
              onCellChange(ref, { ...existing, value: editingValue });
              onCommitEdit(ref);
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
              textDecoration: cellData?.underline ? "underline" : "none",
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
          {autocompleteIsOpen && editingValue.startsWith("=") && (
            <CellAutocomplete
              suggestions={autocompleteSuggestions}
              inputValue={formulaPrefix}
              onSelect={onAutocompleteSelect}
              onClose={() => {}}
              style={{ top: GRID.ROW_HEIGHT, left: 0 }}
            />
          )}
        </>
      ) : isDropdown ? (
        <CellDropdown
          options={cellData?.dropdownOptions ?? []}
          currentLabel={cellData?.value ?? ""}
          onSelect={onDropdownSelect}
          onClose={onDropdownClose}
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
            fontWeight: cellData?.bold ? 600 : 400,
            fontStyle: cellData?.italic ? "italic" : "normal",
            textDecoration: cellData?.underline ? "underline" : "none",
            textAlign: cellData?.align ?? "left",
            color: cellData?.textColor ?? "var(--foreground)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayValue}
          {cellData?.cellType === "dropdown" && (
            <ChevronDown
              className="inline-block ml-0.5 size-3 text-muted-foreground align-middle"
              style={{ marginTop: -2 }}
            />
          )}
        </span>
      )}

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
}

// Local helper — same as spreadsheet-utils cellRef but avoids name clash with prop
function _cellRef(row: number, col: number): string {
  let colStr = "";
  let n = col + 1;
  while (n > 0) {
    colStr = String.fromCharCode(64 + (n % 26 || 26)) + colStr;
    n = Math.floor((n - 1) / 26);
  }
  return `${colStr}${row + 1}`;
}
