"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";
import { useDateRange } from "@/modules/reports/hooks/useDateRange";
import { FinancialDashboard } from "@/modules/financials/components/FinancialDashboard";
import { ExportMenu } from "@/modules/financials/components/ExportMenu";
import { SpreadsheetShell } from "@/modules/financials/components/SpreadsheetShell";
import { AddExpenseButton } from "@/modules/financials/components/ExpenseSpreadsheet";
import { AddRevenueButton } from "@/modules/financials/components/RevenueSpreadsheet";
import { CreateGiftCardDialog } from "@/modules/financials/components/GiftCardSpreadsheet";
import { CommissionSettingsButton } from "@/modules/financials/components/CommissionView";
import {
  GRID,
  getFixedTabColCount,
  getRowCountFromCells,
  type SheetTab,
  type CellData,
  type CellMap,
} from "@/modules/financials/lib/spreadsheet-types";
import { useExpensesCells } from "@/modules/financials/hooks/useExpensesCells";
import { useRevenueCells } from "@/modules/financials/hooks/useRevenueCells";
import { useGiftCardCells } from "@/modules/financials/hooks/useGiftCardCells";
import { useCommissionCells } from "@/modules/financials/hooks/useCommissionCells";
import { useDailyClosingCells } from "@/modules/financials/hooks/useDailyClosingCells";
import { useFreeformCells } from "@/modules/financials/hooks/useFreeformCells";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const FIXED_TABS: SheetTab[] = [
  { id: "expenses", label: "Expenses", isFixed: true, type: "expenses", columnCount: getFixedTabColCount("expenses") },
  { id: "revenue", label: "Revenue", isFixed: true, type: "revenue", columnCount: getFixedTabColCount("revenue") },
  { id: "commissions", label: "Commissions", isFixed: true, type: "commissions", columnCount: getFixedTabColCount("commissions") },
  { id: "giftcards", label: "Gift Cards", isFixed: true, type: "giftcards", columnCount: getFixedTabColCount("giftcards") },
  { id: "closing", label: "Daily Closing", isFixed: true, type: "closing", columnCount: getFixedTabColCount("closing") },
];

export default function FinancialsPage() {
  const { currentRole, activeOrganization } = useOrganization();
  const { from, to } = useDateRange();
  const [activeTab, setActiveTab] = useState("expenses");
  const [closingDate, setClosingDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Freeform sheets from backend
  const freeformSheets = useQuery(
    api.spreadsheetSheets.list,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );
  const createSheet = useMutation(api.spreadsheetSheets.create);
  const renameSheet = useMutation(api.spreadsheetSheets.rename);
  const removeSheet = useMutation(api.spreadsheetSheets.remove);

  // Determine active freeform sheet ID
  const activeFreeformId = freeformSheets?.find((s) => s._id === activeTab)
    ? (activeTab as Id<"spreadsheetSheets">)
    : null;

  // Build combined tabs
  const userTabs: SheetTab[] = (freeformSheets ?? []).map((s) => ({
    id: s._id,
    label: s.name,
    isFixed: false,
    columnCount: s.columnCount ?? GRID.DEFAULT_FREEFORM_COLS,
    rowCount: s.rowCount ?? GRID.DEFAULT_FREEFORM_ROWS,
  }));
  const allTabs = [...FIXED_TABS, ...userTabs];

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
        tabs={allTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        from={from}
        to={to}
        closingDate={closingDate}
        setClosingDate={setClosingDate}
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
            setActiveTab("expenses");
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
  from,
  to,
  closingDate,
  setClosingDate,
  activeFreeformId,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
}: {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  from: string;
  to: string;
  closingDate: string;
  setClosingDate: (d: string) => void;
  activeFreeformId: Id<"spreadsheetSheets"> | null;
  onAddSheet: () => void;
  onRenameSheet: (id: string, name: string) => void;
  onDeleteSheet: (id: string) => void;
}) {
  // All hooks called unconditionally
  const expenses = useExpensesCells(from, to);
  const revenue = useRevenueCells(from, to);
  const giftCards = useGiftCardCells();
  const commissions = useCommissionCells(from, to);
  const dailyClosing = useDailyClosingCells(closingDate, setClosingDate);
  // Derive active tab column count
  const activeTabObj = tabs.find((t) => t.id === activeTab);
  const isFixedTab = activeTabObj?.isFixed ?? false;
  const activeColumnCount = isFixedTab
    ? (activeTabObj?.columnCount ?? GRID.DEFAULT_FREEFORM_COLS)
    : undefined; // freeform managed by hook

  const freeform = useFreeformCells(
    activeFreeformId,
    activeTabObj?.columnCount,
    activeTabObj?.rowCount,
  );

  // For freeform tabs, use the hook's counts (supports optimistic updates)
  const columnCount = isFixedTab
    ? (activeColumnCount ?? GRID.DEFAULT_FREEFORM_COLS)
    : freeform.columnCount;

  // Determine which cells/handlers to use based on active tab
  let cells: CellMap = {};
  let readOnlyCells = new Set<string>();
  let cellChangeHandler: (ref: string, data: CellData) => void = () => {};

  if (activeTab === "expenses") {
    cells = expenses.cells;
    readOnlyCells = expenses.readOnlyCells;
    cellChangeHandler = (ref, data) => {
      const handler = expenses.editHandlers[ref];
      if (handler) handler(data.value);
    };
  } else if (activeTab === "revenue") {
    cells = revenue.cells;
    readOnlyCells = revenue.readOnlyCells;
    cellChangeHandler = (ref, data) => {
      const handler = revenue.editHandlers[ref];
      if (handler) handler(data.value);
    };
  } else if (activeTab === "giftcards") {
    cells = giftCards.cells;
    readOnlyCells = giftCards.readOnlyCells;
  } else if (activeTab === "commissions") {
    cells = commissions.cells;
    readOnlyCells = commissions.readOnlyCells;
  } else if (activeTab === "closing") {
    cells = dailyClosing.cells;
    readOnlyCells = dailyClosing.readOnlyCells;
    cellChangeHandler = (ref, data) => {
      const handler = dailyClosing.editHandlers[ref];
      if (handler) handler(data.value);
    };
  } else if (activeFreeformId) {
    cells = freeform.cells;
    cellChangeHandler = freeform.onCellChange;
  }

  // For fixed tabs, derive row count from cell data; for freeform, use the hook's state
  const rowCount = isFixedTab
    ? getRowCountFromCells(cells)
    : freeform.rowCount;

  // Tab-specific ribbon actions
  const ribbonActions = (
    <div className="flex items-center gap-2">
      <DateRangePicker />
      <ExportMenu from={from} to={to} />
      {activeTab === "expenses" && <AddExpenseButton />}
      {activeTab === "revenue" && <AddRevenueButton />}
      {activeTab === "giftcards" && <CreateGiftCardDialog />}
      {activeTab === "commissions" && <CommissionSettingsButton />}
      {activeTab === "closing" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="h-8 text-xs border border-border rounded px-2 bg-background"
          />
          {dailyClosing.isClosed ? (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Lock className="size-3" />
              Closed
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Lock className="mr-1 size-3.5" />
                  Close Day
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close day {closingDate}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will lock all expenses and revenue entries for this
                    date. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={dailyClosing.closeDay}>
                    Close Day
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );

  return (
    <SpreadsheetShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      cells={cells}
      onCellChange={cellChangeHandler}
      readOnlyCells={readOnlyCells}
      columnCount={columnCount}
      isFixedTab={isFixedTab}
      onAddColumn={isFixedTab ? undefined : freeform.onAddColumn}
      onDeleteLastColumn={isFixedTab ? undefined : freeform.onDeleteLastColumn}
      rowCount={rowCount}
      onAddRow={isFixedTab ? undefined : freeform.onAddRow}
      onDeleteLastRow={isFixedTab ? undefined : freeform.onDeleteLastRow}
      onAddSheet={onAddSheet}
      onRenameSheet={onRenameSheet}
      onDeleteSheet={onDeleteSheet}
      ribbonActions={ribbonActions}
      dashboard={
        <Suspense fallback={<Skeleton className="h-12" />}>
          <FinancialDashboard from={from} to={to} />
        </Suspense>
      }
    />
  );
}
