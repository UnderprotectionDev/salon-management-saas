"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { SpreadsheetShell } from "@/modules/financials/components/SpreadsheetShell";
import type { MergedRegion } from "@/modules/financials/lib/merge-utils";
import {
  GRID,
  type SheetTab,
  type CellData,
  type CellMap,
} from "@/modules/financials/lib/spreadsheet-types";
import { useFreeformCells } from "@/modules/financials/hooks/useFreeformCells";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function FinancialsPage() {
  const { currentRole, activeOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<string>("");

  // Freeform sheets from backend
  const freeformSheets = useQuery(
    api.spreadsheetSheets.list,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );
  const createSheet = useMutation(api.spreadsheetSheets.create);
  const renameSheet = useMutation(api.spreadsheetSheets.rename);
  const removeSheet = useMutation(api.spreadsheetSheets.remove);

  // Auto-select first sheet when loaded
  const resolvedActiveTab = freeformSheets?.find((s) => s._id === activeTab)
    ? activeTab
    : (freeformSheets?.[0]?._id ?? "");

  // Determine active freeform sheet ID
  const activeFreeformId = freeformSheets?.find(
    (s) => s._id === resolvedActiveTab,
  )
    ? (resolvedActiveTab as Id<"spreadsheetSheets">)
    : null;

  // Build tabs
  const tabs: SheetTab[] = (freeformSheets ?? []).map((s) => ({
    id: s._id,
    label: s.name,
    columnCount: s.columnCount ?? GRID.DEFAULT_FREEFORM_COLS,
    rowCount: s.rowCount ?? GRID.DEFAULT_FREEFORM_ROWS,
    freezeRow: s.freezeRow ?? 0,
    freezeCol: s.freezeCol ?? 0,
    mergedRegions: s.mergedRegions as MergedRegion[] | undefined,
  }));

  if (!currentRole) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (currentRole !== "owner") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Owner access required</h2>
          <p className="text-muted-foreground">
            Financial management is only available to salon owners.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <FinancialsContent
        tabs={tabs}
        activeTab={resolvedActiveTab}
        onTabChange={setActiveTab}
        activeFreeformId={activeFreeformId}
        onAddSheet={async () => {
          if (!activeOrganization) return;
          try {
            const num = (freeformSheets?.length ?? 0) + 1;
            const id = await createSheet({
              organizationId: activeOrganization._id,
              name: `Sheet${num}`,
            });
            setActiveTab(id);
          } catch {
            // mutation failed — Convex will log the error
          }
        }}
        onRenameSheet={async (id, name) => {
          if (!activeOrganization) return;
          try {
            await renameSheet({
              organizationId: activeOrganization._id,
              id: id as Id<"spreadsheetSheets">,
              name,
            });
          } catch {
            // mutation failed
          }
        }}
        onDeleteSheet={async (id) => {
          if (!activeOrganization) return;
          try {
            await removeSheet({
              organizationId: activeOrganization._id,
              id: id as Id<"spreadsheetSheets">,
            });
            // Switch to first remaining sheet
            const remaining = freeformSheets?.filter((s) => s._id !== id);
            setActiveTab(remaining?.[0]?._id ?? "");
          } catch {
            // mutation failed
          }
        }}
      />
    </div>
  );
}

/** Inner component that uses the hooks (must be called unconditionally) */
function FinancialsContent({
  tabs,
  activeTab,
  onTabChange,
  activeFreeformId,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
}: {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  activeFreeformId: Id<"spreadsheetSheets"> | null;
  onAddSheet: () => void;
  onRenameSheet: (id: string, name: string) => void;
  onDeleteSheet: (id: string) => void;
}) {
  const { activeOrganization } = useOrganization();
  const activeTabObj = tabs.find((t) => t.id === activeTab);

  const freeform = useFreeformCells(
    activeFreeformId,
    activeTabObj?.columnCount,
    activeTabObj?.rowCount,
  );

  const setFreezeMut = useMutation(api.spreadsheetSheets.setFreeze);
  const setMergedRegionsMut = useMutation(
    api.spreadsheetSheets.setMergedRegions,
  );

  const cells: CellMap = activeFreeformId ? freeform.cells : {};
  const cellChangeHandler: (ref: string, data: CellData) => void =
    activeFreeformId ? freeform.onCellChange : () => {};

  return (
    <SpreadsheetShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      cells={cells}
      onCellChange={cellChangeHandler}
      onBulkReplace={activeFreeformId ? freeform.onBulkReplace : undefined}
      columnCount={freeform.columnCount}
      onAddColumn={freeform.onAddColumn}
      onDeleteLastColumn={freeform.onDeleteLastColumn}
      rowCount={freeform.rowCount}
      onAddRow={freeform.onAddRow}
      onDeleteLastRow={freeform.onDeleteLastRow}
      onAddSheet={onAddSheet}
      onRenameSheet={onRenameSheet}
      onDeleteSheet={onDeleteSheet}
      onSetFreeze={(row, col) => {
        if (!activeOrganization || !activeFreeformId) return;
        setFreezeMut({
          organizationId: activeOrganization._id,
          id: activeFreeformId,
          freezeRow: row,
          freezeCol: col,
        }).catch(() => {});
      }}
      onSetMergedRegions={(regions) => {
        if (!activeOrganization || !activeFreeformId) return;
        setMergedRegionsMut({
          organizationId: activeOrganization._id,
          id: activeFreeformId,
          mergedRegions: regions,
        }).catch(() => {});
      }}
    />
  );
}
