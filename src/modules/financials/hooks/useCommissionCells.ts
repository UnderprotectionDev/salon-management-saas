"use client";

import { useQuery } from "convex/react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { mapCommissionsToCells } from "../lib/cell-mappers";
import type { CellMap } from "../lib/spreadsheet-types";

const EMPTY_CELLS: CellMap = {};
const EMPTY_READ_ONLY = new Set<string>();

interface UseCommissionCellsResult {
  cells: CellMap;
  readOnlyCells: Set<string>;
  loading: boolean;
}

export function useCommissionCells(
  from: string,
  to: string,
): UseCommissionCellsResult {
  const { activeOrganization } = useOrganization();

  const report = useQuery(
    api.financials.getCommissionReport,
    activeOrganization
      ? { organizationId: activeOrganization._id, startDate: from, endDate: to }
      : "skip",
  );

  if (!report) {
    return { cells: EMPTY_CELLS, readOnlyCells: EMPTY_READ_ONLY, loading: true };
  }

  const result = mapCommissionsToCells(
    report as Array<{
      staffName: string;
      model: string;
      totalRevenue: number;
      commissionRate: number;
      commissionAmount: number;
    }>,
  );
  return {
    cells: result.cells,
    readOnlyCells: result.readOnlyCells,
    loading: false,
  };
}
