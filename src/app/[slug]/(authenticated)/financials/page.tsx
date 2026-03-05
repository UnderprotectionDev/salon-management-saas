"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SpreadsheetShell } from "@/modules/financials/components/SpreadsheetShell";
import { useFreeformCells } from "@/modules/financials/hooks/useFreeformCells";
import type { MergedRegion } from "@/modules/financials/lib/merge-utils";
import {
  type CellData,
  type CellMap,
  GRID,
  type SheetTab,
} from "@/modules/financials/lib/spreadsheet-types";
import { useOrganization } from "@/modules/organization";
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
  const reorderSheets = useMutation(api.spreadsheetSheets.reorder);

  // Custom formulas
  const customFormulasDocs = useQuery(
    api.customFormulas.list,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  // Build custom formulas map for evaluator
  const customFormulasMap: Record<string, string> = {};
  if (customFormulasDocs) {
    for (const f of customFormulasDocs) {
      customFormulasMap[f.name] = f.body;
    }
  }

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
    conditionalFormats: s.conditionalFormats as string | undefined,
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
    <div className="flex flex-col h-full -m-4 lg:-m-6">
      <FinancialsContent
        tabs={tabs}
        activeTab={resolvedActiveTab}
        onTabChange={setActiveTab}
        activeFreeformId={activeFreeformId}
        customFormulas={customFormulasMap}
        customFormulasDocs={customFormulasDocs ?? []}
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
        onReorderSheets={async (orderedIds) => {
          if (!activeOrganization) return;
          try {
            await reorderSheets({
              organizationId: activeOrganization._id,
              orderedIds: orderedIds as Id<"spreadsheetSheets">[],
            });
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
  customFormulas,
  customFormulasDocs,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  onReorderSheets,
}: {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  activeFreeformId: Id<"spreadsheetSheets"> | null;
  customFormulas: Record<string, string>;
  customFormulasDocs: Array<{
    _id: Id<"customFormulas">;
    name: string;
    body: string;
    description?: string;
  }>;
  onAddSheet: () => void;
  onRenameSheet: (id: string, name: string) => void;
  onDeleteSheet: (id: string) => void;
  onReorderSheets: (orderedIds: string[]) => void;
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
  const setCondFormatsMut = useMutation(
    api.spreadsheetSheets.setConditionalFormats,
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
      onReorderSheets={onReorderSheets}
      customFormulas={customFormulas}
      customFormulasDocs={customFormulasDocs}
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
      onSetConditionalFormats={(rules) => {
        if (!activeOrganization || !activeFreeformId) return;
        setCondFormatsMut({
          organizationId: activeOrganization._id,
          id: activeFreeformId,
          conditionalFormats: JSON.stringify(rules),
        }).catch(() => {});
      }}
    />
  );
}
