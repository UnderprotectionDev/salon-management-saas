"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { NumberFormat } from "../lib/number-format";
import { type CellData, type CellMap, GRID } from "../lib/spreadsheet-types";
import type { ValidationRule } from "../lib/validation-types";

interface UseFreeformCellsResult {
  cells: CellMap;
  onCellChange: (ref: string, data: CellData) => void;
  /** Replace the entire CellMap atomically (used for row/col insert/delete) */
  onBulkReplace: (newCells: CellMap) => void;
  loading: boolean;
  columnCount: number;
  onAddColumn: () => void;
  onDeleteLastColumn: () => void;
  rowCount: number;
  onAddRow: () => void;
  onDeleteLastRow: () => void;
}

export function useFreeformCells(
  sheetId: Id<"spreadsheetSheets"> | null,
  initialColumnCount?: number,
  initialRowCount?: number,
): UseFreeformCellsResult {
  const { activeOrganization } = useOrganization();

  // Optimistic pending changes (Bug C fix)
  const pendingChanges = useRef<CellMap>({});
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dbCells = useQuery(
    api.spreadsheetCells.listBySheet,
    activeOrganization && sheetId
      ? { organizationId: activeOrganization._id, sheetId }
      : "skip",
  );

  const bulkUpsert = useMutation(api.spreadsheetCells.bulkUpsert);
  const setColumnCountMut = useMutation(api.spreadsheetSheets.setColumnCount);
  const setRowCountMut = useMutation(api.spreadsheetSheets.setRowCount);

  // Local column count state — syncs from prop, allows optimistic updates
  const [columnCount, setColumnCount] = useState(
    initialColumnCount ?? GRID.DEFAULT_FREEFORM_COLS,
  );
  useEffect(() => {
    setColumnCount(initialColumnCount ?? GRID.DEFAULT_FREEFORM_COLS);
  }, [initialColumnCount]);

  // Local row count state — syncs from prop, allows optimistic updates
  const [rowCount, setRowCount] = useState(
    initialRowCount ?? GRID.DEFAULT_FREEFORM_ROWS,
  );
  useEffect(() => {
    setRowCount(initialRowCount ?? GRID.DEFAULT_FREEFORM_ROWS);
  }, [initialRowCount]);

  function onAddColumn() {
    if (!activeOrganization || !sheetId) return;
    const next = Math.min(columnCount + 1, GRID.MAX_COLS);
    setColumnCount(next);
    setColumnCountMut({
      organizationId: activeOrganization._id,
      id: sheetId,
      columnCount: next,
    });
  }

  function onDeleteLastColumn() {
    if (!activeOrganization || !sheetId) return;
    const next = Math.max(columnCount - 1, 1);
    setColumnCount(next);
    setColumnCountMut({
      organizationId: activeOrganization._id,
      id: sheetId,
      columnCount: next,
    });
  }

  function onAddRow() {
    if (!activeOrganization || !sheetId) return;
    const next = Math.min(rowCount + 1, GRID.MAX_ROWS);
    setRowCount(next);
    setRowCountMut({
      organizationId: activeOrganization._id,
      id: sheetId,
      rowCount: next,
    });
  }

  function onDeleteLastRow() {
    if (!activeOrganization || !sheetId) return;
    const next = Math.max(rowCount - 1, 1);
    setRowCount(next);
    setRowCountMut({
      organizationId: activeOrganization._id,
      id: sheetId,
      rowCount: next,
    });
  }

  // Build CellMap from DB records + merge pending changes
  const cells: CellMap = {};
  if (dbCells) {
    for (const cell of dbCells) {
      cells[cell.cellRef] = {
        value: cell.value,
        bold: cell.bold ?? undefined,
        italic: cell.italic ?? undefined,
        underline: cell.underline ?? undefined,
        align: cell.align ?? undefined,
        fontSize: cell.fontSize ?? undefined,
        fontFamily: cell.fontFamily ?? undefined,
        bgColor: cell.bgColor ?? undefined,
        textColor: cell.textColor ?? undefined,
        numberFormat: (cell.numberFormat as NumberFormat) ?? undefined,
        validationRule: cell.validationRule
          ? (() => {
              try {
                return JSON.parse(cell.validationRule) as ValidationRule;
              } catch {
                return undefined;
              }
            })()
          : undefined,
      };
    }
  }
  // Overlay optimistic pending changes on top of DB state
  for (const [ref, data] of Object.entries(pendingChanges.current)) {
    cells[ref] = data;
  }

  const flush = useCallback(() => {
    if (!activeOrganization || !sheetId) return;
    const entries = Object.entries(pendingChanges.current);
    if (entries.length === 0) return;

    const cellsToSend = entries.map(([ref, data]) => ({
      cellRef: ref,
      value: data.value,
      bold: data.bold,
      italic: data.italic,
      underline: data.underline,
      align: data.align,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      bgColor: data.bgColor,
      textColor: data.textColor,
      numberFormat: data.numberFormat,
      validationRule: data.validationRule
        ? JSON.stringify(data.validationRule)
        : undefined,
    }));

    const toSend = { ...pendingChanges.current };
    pendingChanges.current = {};

    bulkUpsert({
      organizationId: activeOrganization._id,
      sheetId,
      cells: cellsToSend,
    }).catch(() => {
      // Restore pending changes on failure so they aren't lost
      pendingChanges.current = { ...toSend, ...pendingChanges.current };
    });
  }, [activeOrganization, sheetId, bulkUpsert]);

  // Flush pending changes on unmount to avoid data loss
  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      flush();
    };
  }, [flush]);

  function onCellChange(ref: string, data: CellData) {
    if (!activeOrganization || !sheetId) return;

    // Immediately store in pending for optimistic UI
    pendingChanges.current[ref] = data;

    // Batch flush: 800ms after last change
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
    }
    flushTimer.current = setTimeout(() => {
      flush();
      flushTimer.current = null;
    }, 800);
  }

  const replaceAllMut = useMutation(api.spreadsheetCells.replaceAllCells);

  function onBulkReplace(newCells: CellMap) {
    if (!activeOrganization || !sheetId) return;

    // Clear any pending changes since we're replacing everything
    pendingChanges.current = {};
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }

    // Set all new cells as pending for optimistic UI
    for (const [ref, data] of Object.entries(newCells)) {
      pendingChanges.current[ref] = data;
    }

    const cellsToSend = Object.entries(newCells).map(([ref, data]) => ({
      cellRef: ref,
      value: data.value,
      bold: data.bold,
      italic: data.italic,
      underline: data.underline,
      align: data.align,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      bgColor: data.bgColor,
      textColor: data.textColor,
      numberFormat: data.numberFormat,
      validationRule: data.validationRule
        ? JSON.stringify(data.validationRule)
        : undefined,
    }));

    replaceAllMut({
      organizationId: activeOrganization._id,
      sheetId,
      cells: cellsToSend,
    }).catch(() => {
      // On failure the next DB sync will overwrite
    });
  }

  return {
    cells,
    onCellChange,
    onBulkReplace,
    loading: !dbCells,
    columnCount,
    onAddColumn,
    onDeleteLastColumn,
    rowCount,
    onAddRow,
    onDeleteLastRow,
  };
}
