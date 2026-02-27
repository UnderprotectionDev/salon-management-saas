"use client";

import { useQuery } from "convex/react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { mapGiftCardsToCells } from "../lib/cell-mappers";
import type { CellMap } from "../lib/spreadsheet-types";

interface UseGiftCardCellsResult {
  cells: CellMap;
  readOnlyCells: Set<string>;
  loading: boolean;
}

export function useGiftCardCells(): UseGiftCardCellsResult {
  const { activeOrganization } = useOrganization();

  const cards = useQuery(
    api.giftCards.list,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  if (!cards) {
    return { cells: {}, readOnlyCells: new Set(), loading: true };
  }

  const result = mapGiftCardsToCells(cards);
  return {
    cells: result.cells,
    readOnlyCells: result.readOnlyCells,
    loading: false,
  };
}
