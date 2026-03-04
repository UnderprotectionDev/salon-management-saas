# Milestone 13: Freeform Financial Spreadsheet

**Status:** ✅ Complete | **User Stories:** US-FS01~US-FS12

## Summary

Excel-like freeform spreadsheet available to salon owners at `/financials`. Fully persisted to Convex with real-time sync, multi-sheet support, rich cell formatting, formula engine, conditional formatting, cell validation, freeze panes, merge cells, PDF export, and undo/redo.

## What Was Built

- **Multi-sheet tabs:** Create, rename, delete, and reorder sheets. Auto-select first sheet on load.
- **Formula engine:** 50+ functions across math, text, date, logical, financial, conditional, and lookup categories (`=SUM`, `=IF`, `=VLOOKUP`, `=PMT`, etc.)
- **Cell formatting:** Bold, italic, underline, text/background color, font size, font family, alignment, number formats (currency, percentage, date, custom)
- **Conditional formatting:** Rule-based cell highlighting with color scales, data bars, icon sets
- **Cell validation:** Dropdown lists, number ranges, date constraints, text length, custom formula rules
- **Merge cells:** Multi-cell merge/unmerge with layout preservation
- **Freeze panes:** Freeze rows and/or columns from the top/left
- **Column resize:** Drag-to-resize column widths, persisted per session
- **Column filters:** Filter rows by column value
- **Row/column management:** Insert and delete rows/columns with reference shift (formulas auto-adjust)
- **Fill series:** AutoFill handle for sequences, dates, and copied patterns
- **Search overlay:** Ctrl+F find-and-replace across the sheet
- **Undo/redo:** Full history via `useUndoHistory` hook
- **Formula bar:** Displays and edits raw cell formula
- **Formula quick bar:** AutoSum and common function shortcuts
- **Context menu:** Right-click actions (insert/delete row/col, merge, copy, paste special)
- **Paste special:** Paste values-only or formats-only
- **Cell autocomplete:** Suggests existing values from same column
- **Cell dropdown:** Inline picker for cells with validation dropdown lists
- **PDF export:** Print-quality export of current sheet via dialog
- **Auto-save:** 300ms debounce flush to Convex on every change; bulk replace for structural mutations

## User Stories

| ID      | Title                                 | Type          |
| ------- | ------------------------------------- | ------------- |
| US-FS01 | Multi-sheet Create/Rename/Delete      | Full-Stack    |
| US-FS02 | Cell Value Entry & Auto-Save          | Full-Stack    |
| US-FS03 | Formula Engine (50+ functions)        | Frontend      |
| US-FS04 | Rich Cell Formatting (fonts, colors)  | Frontend      |
| US-FS05 | Number Formats (currency, %, date)    | Frontend      |
| US-FS06 | Conditional Formatting Rules          | Full-Stack    |
| US-FS07 | Cell Validation Rules                 | Frontend      |
| US-FS08 | Merge Cells / Freeze Panes            | Full-Stack    |
| US-FS09 | Row/Column Insert, Delete & Resize    | Full-Stack    |
| US-FS10 | Fill Series & AutoFill                | Frontend      |
| US-FS11 | Undo/Redo History                     | Frontend      |
| US-FS12 | PDF Export                            | Frontend      |

## Schema Changes

2 new tables:

- `spreadsheetSheets` — index: `by_org`
- `spreadsheetCells` — indexes: `by_sheet`, `by_org_sheet`

## Key Files

### Backend (Convex)

- `convex/spreadsheetSheets.ts` — list, create, rename, remove, setColumnCount, setRowCount, reorder, setFreeze, setMergedRegions, setConditionalFormats
- `convex/spreadsheetCells.ts` — listBySheet, upsertCell, bulkUpsert, replaceAllCells, deleteBySheet

### Frontend

- `src/app/[slug]/(authenticated)/financials/page.tsx` — Page entry point; loads sheets, resolves active tab, renders `FinancialsContent`
- `src/modules/financials/hooks/useFreeformCells.ts` — Real-time cell sync; optimistic pending queue, debounce flush, add/delete row+col
- `src/modules/financials/lib/`
  - `spreadsheet-types.ts` — `CellData`, `CellMap`, `SheetTab`, `GRID` constants
  - `spreadsheet-formula.ts` — Formula parser/evaluator entry point
  - `formulas/` — Per-category formula implementations: `math.ts`, `text.ts`, `date.ts`, `logical.ts`, `financial.ts`, `conditional.ts`, `lookup.ts`, `registry.ts`
  - `cell-refs.ts` — A1 ↔ row/col conversion utilities
  - `conditional-format-types.ts` — `CondFormatRule` type definitions
  - `conditional-format-engine.ts` — Rule evaluation against cell values
  - `validation-types.ts` — `ValidationRule` type definitions
  - `validation-engine.ts` — Rule evaluation and error messaging
  - `merge-utils.ts` — Add/remove/find merges; adjust on row/col shift
  - `cell-shift.ts` — Shift all cell refs on row/col insert/delete
  - `fill-series.ts` — Series detection, fill value generation, formula ref adjustment
  - `formula-refs.ts` — Extract and color-code formula cell references
  - `formula-helpers.ts` — Range expansion, cell lookup helpers
  - `number-format.ts` — Format string → display value converter
  - `pdf-export.ts` — Canvas-based PDF rendering
  - `spreadsheet-utils.ts` — `cellRef()`, column label generation
  - `spreadsheet-context.tsx` — React context for shared spreadsheet state
- `src/modules/financials/components/`
  - `SpreadsheetShell.tsx` — Top-level shell: ribbon, formula bar, grid, sheet tabs, dialogs
  - `SpreadsheetGrid.tsx` — Virtualized grid; keyboard nav, cell selection, editing
  - `Ribbon.tsx` — Toolbar with formatting, insert, view, and formula shortcuts
  - `FormulaBar.tsx` — Formula input bound to active cell
  - `FormulaQuickBar.tsx` — AutoSum / quick function picker
  - `SheetTabs.tsx` — Tab strip with add/rename/delete/reorder
  - `GridContextMenu.tsx` — Right-click context menu
  - `ConditionalFormatDialog.tsx` — Rule builder dialog
  - `ValidationRuleDialog.tsx` — Validation constraint dialog
  - `PdfExportDialog.tsx` — Print settings and export trigger
  - `SearchOverlay.tsx` — Find/replace overlay (Ctrl+F)
  - `PasteSpecialMenu.tsx` — Paste values/formats submenu
  - `ColorPicker.tsx` — Hex + palette color picker
  - `CellAutocomplete.tsx` — Column-based value suggestions
  - `CellDropdown.tsx` — Dropdown picker for validated cells
  - `ColumnResizeHandle.tsx` — Drag handle for column width
  - `ColumnFilterPopover.tsx` — Column value filter popover

## Key Decisions

1. **Owner-only access** — Uses `ownerQuery`/`ownerMutation`; staff see "Owner access required" message
2. **Sparse cell storage** — Only non-empty cells are persisted; empty cells are deleted on clear
3. **Optimistic pending queue** — `useFreeformCells` batches writes to a `pendingChanges` ref, flushed after 300ms; Convex DB state merges on top of pending for instant UI
4. **Bulk replace for structural mutations** — Row/col insert/delete calls `replaceAllCells` (atomic delete + re-insert) to avoid stale refs
5. **JSON-serialized sub-fields** — `conditionalFormats` and `validationRule` are stored as JSON strings in Convex to avoid deeply nested validator complexity
6. **Formula evaluation is client-side only** — No server-side formula computation; evaluated on render from the `CellMap`
7. **No pagination** — All cells for a sheet are loaded at once (`listBySheet`); max sheet size is 52 cols × 5000 rows

## Constraints

- Max 52 columns (A–AZ), max 5,000 rows per sheet
- Sheets are per-organization (not per-user)
- Deleting a sheet cascades to all its cells
- Column widths and filter state are local (not persisted to Convex)
