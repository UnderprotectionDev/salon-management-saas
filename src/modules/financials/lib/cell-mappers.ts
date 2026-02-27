import {
  formatPrice,
  kurusToLira,
  liraToKurus,
} from "@/modules/services/lib/currency";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { getCategoryLabel } from "./categories";
import {
  getPaymentMethodLabel,
  getRecurrenceLabel,
  getRevenueTypeLabel,
} from "./constants";
import type { CellData, CellMap } from "./spreadsheet-types";
import { cellRef } from "./spreadsheet-utils";

type EditHandler = (newValue: string) => void;

interface MapResult {
  cells: CellMap;
  readOnlyCells: Set<string>;
  editHandlers: Record<string, EditHandler>;
}

// ────────────────────────────────────────────────────────────────────────────
// Expenses
// ────────────────────────────────────────────────────────────────────────────

const EXPENSE_HEADERS = [
  "Date",
  "Category",
  "Description",
  "Amount (TRY)",
  "Payment",
  "Vendor",
  "Recurrence",
  "Tax Inc.",
];

export function mapExpensesToCells(
  expenses: Doc<"expenses">[],
  onFieldChange: (id: Id<"expenses">, field: string, value: unknown) => void,
): MapResult {
  const cells: CellMap = {};
  const readOnlyCells = new Set<string>();
  const editHandlers: Record<string, EditHandler> = {};

  // Header row
  for (let c = 0; c < EXPENSE_HEADERS.length; c++) {
    const ref = cellRef(0, c);
    cells[ref] = { value: EXPENSE_HEADERS[c], bold: true, align: "center" };
    readOnlyCells.add(ref);
  }

  // Data rows
  for (let i = 0; i < expenses.length; i++) {
    const row = i + 1;
    const e = expenses[i];

    cells[cellRef(row, 0)] = { value: e.date };
    editHandlers[cellRef(row, 0)] = (v) => onFieldChange(e._id, "date", v);

    cells[cellRef(row, 1)] = { value: getCategoryLabel(e.category) };
    readOnlyCells.add(cellRef(row, 1)); // use dropdown for category edits

    cells[cellRef(row, 2)] = { value: e.description ?? "" };
    editHandlers[cellRef(row, 2)] = (v) =>
      onFieldChange(e._id, "description", v || undefined);

    cells[cellRef(row, 3)] = {
      value: String(kurusToLira(e.amount)),
      align: "right",
    };
    editHandlers[cellRef(row, 3)] = (v) => {
      const n = Number.parseFloat(v);
      if (!Number.isNaN(n)) onFieldChange(e._id, "amount", liraToKurus(n));
    };

    cells[cellRef(row, 4)] = { value: getPaymentMethodLabel(e.paymentMethod) };
    readOnlyCells.add(cellRef(row, 4));

    cells[cellRef(row, 5)] = { value: e.vendor ?? "" };
    editHandlers[cellRef(row, 5)] = (v) =>
      onFieldChange(e._id, "vendor", v || undefined);

    cells[cellRef(row, 6)] = { value: getRecurrenceLabel(e.recurrence) };
    readOnlyCells.add(cellRef(row, 6));

    cells[cellRef(row, 7)] = { value: e.taxIncluded ? "Yes" : "No" };
    readOnlyCells.add(cellRef(row, 7));
  }

  // Total row
  if (expenses.length > 0) {
    const totalRow = expenses.length + 1;
    cells[cellRef(totalRow, 0)] = {
      value: "Total",
      bold: true,
    };
    readOnlyCells.add(cellRef(totalRow, 0));
    cells[cellRef(totalRow, 3)] = {
      value: `=SUM(D2:D${expenses.length + 1})`,
      bold: true,
      align: "right",
    };
    readOnlyCells.add(cellRef(totalRow, 3));
  }

  return { cells, readOnlyCells, editHandlers };
}

// ────────────────────────────────────────────────────────────────────────────
// Revenue
// ────────────────────────────────────────────────────────────────────────────

const REVENUE_HEADERS = [
  "Date",
  "Type",
  "Amount (TRY)",
  "Payment",
  "Description",
];

export function mapRevenueToCells(
  items: Doc<"additionalRevenue">[],
  onFieldChange: (
    id: Id<"additionalRevenue">,
    field: string,
    value: unknown,
  ) => void,
): MapResult {
  const cells: CellMap = {};
  const readOnlyCells = new Set<string>();
  const editHandlers: Record<string, EditHandler> = {};

  // Header
  for (let c = 0; c < REVENUE_HEADERS.length; c++) {
    const ref = cellRef(0, c);
    cells[ref] = { value: REVENUE_HEADERS[c], bold: true, align: "center" };
    readOnlyCells.add(ref);
  }

  // Data
  for (let i = 0; i < items.length; i++) {
    const row = i + 1;
    const r = items[i];

    cells[cellRef(row, 0)] = { value: r.date };
    editHandlers[cellRef(row, 0)] = (v) => onFieldChange(r._id, "date", v);

    cells[cellRef(row, 1)] = { value: getRevenueTypeLabel(r.type) };
    readOnlyCells.add(cellRef(row, 1));

    cells[cellRef(row, 2)] = {
      value: String(kurusToLira(r.amount)),
      align: "right",
    };
    editHandlers[cellRef(row, 2)] = (v) => {
      const n = Number.parseFloat(v);
      if (!Number.isNaN(n)) onFieldChange(r._id, "amount", liraToKurus(n));
    };

    cells[cellRef(row, 3)] = { value: getPaymentMethodLabel(r.paymentMethod) };
    readOnlyCells.add(cellRef(row, 3));

    cells[cellRef(row, 4)] = { value: r.description ?? "" };
    editHandlers[cellRef(row, 4)] = (v) =>
      onFieldChange(r._id, "description", v || undefined);
  }

  // Total
  if (items.length > 0) {
    const totalRow = items.length + 1;
    cells[cellRef(totalRow, 0)] = { value: "Total", bold: true };
    readOnlyCells.add(cellRef(totalRow, 0));
    cells[cellRef(totalRow, 2)] = {
      value: `=SUM(C2:C${items.length + 1})`,
      bold: true,
      align: "right",
    };
    readOnlyCells.add(cellRef(totalRow, 2));
  }

  return { cells, readOnlyCells, editHandlers };
}

// ────────────────────────────────────────────────────────────────────────────
// Gift Cards (read-only)
// ────────────────────────────────────────────────────────────────────────────

const GIFTCARD_HEADERS = [
  "Code",
  "Purchase Date",
  "Purchaser",
  "Original (TRY)",
  "Balance (TRY)",
  "Status",
  "Expires",
  "Last Used",
];

export function mapGiftCardsToCells(cards: Doc<"giftCards">[]): MapResult {
  const cells: CellMap = {};
  const readOnlyCells = new Set<string>();

  for (let c = 0; c < GIFTCARD_HEADERS.length; c++) {
    const ref = cellRef(0, c);
    cells[ref] = { value: GIFTCARD_HEADERS[c], bold: true, align: "center" };
    readOnlyCells.add(ref);
  }

  for (let i = 0; i < cards.length; i++) {
    const row = i + 1;
    const g = cards[i];

    const rowCells: [number, CellData][] = [
      [0, { value: g.code }],
      [1, { value: g.purchaseDate }],
      [2, { value: g.purchaserName ?? "-" }],
      [3, { value: formatPrice(g.amount), align: "right" }],
      [
        4,
        { value: formatPrice(g.remainingBalance), bold: true, align: "right" },
      ],
      [5, { value: g.status }],
      [6, { value: g.expiryDate ?? "-" }],
      [7, { value: g.lastUsedDate ?? "-" }],
    ];

    for (const [c, data] of rowCells) {
      const ref = cellRef(row, c);
      cells[ref] = data;
      readOnlyCells.add(ref);
    }
  }

  // Active balance total
  const activeBalance = cards
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.remainingBalance, 0);

  if (cards.length > 0) {
    const totalRow = cards.length + 1;
    cells[cellRef(totalRow, 0)] = { value: "Active Balance", bold: true };
    readOnlyCells.add(cellRef(totalRow, 0));
    cells[cellRef(totalRow, 4)] = {
      value: formatPrice(activeBalance),
      bold: true,
      align: "right",
    };
    readOnlyCells.add(cellRef(totalRow, 4));
  }

  return { cells, readOnlyCells, editHandlers: {} };
}

// ────────────────────────────────────────────────────────────────────────────
// Commissions (read-only)
// ────────────────────────────────────────────────────────────────────────────

interface CommissionRow {
  staffName: string;
  model: string;
  totalRevenue: number;
  commissionRate: number;
  commissionAmount: number;
}

const COMMISSION_HEADERS = [
  "Staff",
  "Model",
  "Revenue (TRY)",
  "Rate",
  "Commission (TRY)",
];

export function mapCommissionsToCells(report: CommissionRow[]): MapResult {
  const cells: CellMap = {};
  const readOnlyCells = new Set<string>();

  for (let c = 0; c < COMMISSION_HEADERS.length; c++) {
    const ref = cellRef(0, c);
    cells[ref] = { value: COMMISSION_HEADERS[c], bold: true, align: "center" };
    readOnlyCells.add(ref);
  }

  for (let i = 0; i < report.length; i++) {
    const row = i + 1;
    const r = report[i];

    const rowCells: [number, CellData][] = [
      [0, { value: r.staffName }],
      [1, { value: r.model.charAt(0).toUpperCase() + r.model.slice(1) }],
      [2, { value: formatPrice(r.totalRevenue), align: "right" }],
      [3, { value: `${r.commissionRate}%`, align: "right" }],
      [
        4,
        { value: formatPrice(r.commissionAmount), bold: true, align: "right" },
      ],
    ];

    for (const [c, data] of rowCells) {
      const ref = cellRef(row, c);
      cells[ref] = data;
      readOnlyCells.add(ref);
    }
  }

  // Total
  if (report.length > 0) {
    const total = report.reduce((s, r) => s + r.commissionAmount, 0);
    const totalRow = report.length + 1;
    cells[cellRef(totalRow, 0)] = { value: "Total Commissions", bold: true };
    readOnlyCells.add(cellRef(totalRow, 0));
    cells[cellRef(totalRow, 4)] = {
      value: formatPrice(total),
      bold: true,
      align: "right",
    };
    readOnlyCells.add(cellRef(totalRow, 4));
  }

  return { cells, readOnlyCells, editHandlers: {} };
}

// ────────────────────────────────────────────────────────────────────────────
// Daily Closing
// ────────────────────────────────────────────────────────────────────────────

interface DailyClosingData {
  openingBalance: number;
  revenueCash: number;
  revenueCard: number;
  revenueTransfer: number;
  revenueMobile: number;
  revenueGiftCard: number;
  totalRevenue: number;
  totalExpenses: number;
  calculatedClosingBalance: number;
  actualCashCount?: number;
  variance?: number;
  isClosed: boolean;
}

export function mapDailyClosingToCells(
  data: DailyClosingData,
  onCashCountChange?: (amount: number) => void,
): MapResult {
  const cells: CellMap = {};
  const readOnlyCells = new Set<string>();
  const editHandlers: Record<string, EditHandler> = {};

  // A column = labels, B column = values
  const items: [string, string][] = [
    ["Opening Balance", formatPrice(data.openingBalance)],
    ["Cash Revenue", formatPrice(data.revenueCash)],
    ["Card Revenue", formatPrice(data.revenueCard)],
    ["Transfer Revenue", formatPrice(data.revenueTransfer)],
    ["Mobile Revenue", formatPrice(data.revenueMobile)],
    ["Gift Card Revenue", formatPrice(data.revenueGiftCard)],
    ["Total Revenue", formatPrice(data.totalRevenue)],
    ["Total Expenses", formatPrice(data.totalExpenses)],
    ["Closing Balance", formatPrice(data.calculatedClosingBalance)],
  ];

  if (data.actualCashCount !== undefined) {
    items.push(["Actual Cash", formatPrice(data.actualCashCount)]);
    if (data.variance !== undefined && data.variance !== 0) {
      items.push(["Variance", formatPrice(Math.abs(data.variance))]);
    }
  }

  // Header
  cells[cellRef(0, 0)] = { value: "Item", bold: true, align: "center" };
  cells[cellRef(0, 1)] = { value: "Amount", bold: true, align: "center" };
  readOnlyCells.add(cellRef(0, 0));
  readOnlyCells.add(cellRef(0, 1));

  for (let i = 0; i < items.length; i++) {
    const row = i + 1;
    const [label, value] = items[i];

    cells[cellRef(row, 0)] = {
      value: label,
      bold: label.startsWith("Total") || label === "Closing Balance",
    };
    readOnlyCells.add(cellRef(row, 0));

    cells[cellRef(row, 1)] = {
      value,
      bold: label.startsWith("Total") || label === "Closing Balance",
      align: "right",
    };
    readOnlyCells.add(cellRef(row, 1));
  }

  // Editable cash count row (if not closed)
  if (!data.isClosed && onCashCountChange) {
    const cashRow = items.length + 2;
    cells[cellRef(cashRow, 0)] = {
      value: "Enter Cash Count (TRY)",
      bold: true,
    };
    readOnlyCells.add(cellRef(cashRow, 0));
    cells[cellRef(cashRow, 1)] = {
      value:
        data.actualCashCount !== undefined
          ? String(kurusToLira(data.actualCashCount))
          : "",
      align: "right",
    };
    editHandlers[cellRef(cashRow, 1)] = (v) => {
      const n = Number.parseFloat(v);
      if (!Number.isNaN(n)) onCashCountChange(liraToKurus(n));
    };
  }

  return { cells, readOnlyCells, editHandlers };
}
