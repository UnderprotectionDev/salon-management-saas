"use client";

import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { mapDailyClosingToCells } from "../lib/cell-mappers";
import type { CellMap } from "../lib/spreadsheet-types";

interface UseDailyClosingCellsResult {
  cells: CellMap;
  readOnlyCells: Set<string>;
  editHandlers: Record<string, (newValue: string) => void>;
  loading: boolean;
  isClosed: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  closeDay: () => Promise<void>;
}

export function useDailyClosingCells(
  selectedDate: string,
  setSelectedDate: (date: string) => void,
): UseDailyClosingCellsResult {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?._id;

  const queryArgs = orgId
    ? { organizationId: orgId, date: selectedDate }
    : "skip";

  const data = useQuery(api.dailyClosing.getForDate, queryArgs);

  const updateCashCountMut = useMutation(
    api.dailyClosing.updateCashCount,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.dailyClosing.getForDate, {
      organizationId: args.organizationId,
      date: args.date,
    });
    if (current == null) return;

    localStore.setQuery(
      api.dailyClosing.getForDate,
      { organizationId: args.organizationId, date: args.date },
      {
        ...current,
        actualCashCount: args.actualCashCount,
        variance: args.actualCashCount - current.calculatedClosingBalance,
      },
    );
  });

  const closeDayMut = useMutation(api.dailyClosing.closeDay);

  if (!data || !activeOrganization) {
    return {
      cells: {},
      readOnlyCells: new Set(),
      editHandlers: {},
      loading: !data,
      isClosed: false,
      selectedDate,
      setSelectedDate,
      closeDay: async () => {},
    };
  }

  function onCashCountChange(amount: number) {
    if (!activeOrganization) return;
    updateCashCountMut({
      organizationId: activeOrganization._id,
      date: selectedDate,
      actualCashCount: amount,
    });
  }

  const result = mapDailyClosingToCells(data, onCashCountChange);

  async function closeDay() {
    if (!activeOrganization) return;
    await closeDayMut({
      organizationId: activeOrganization._id,
      date: selectedDate,
    });
  }

  return {
    ...result,
    loading: false,
    isClosed: data.isClosed,
    selectedDate,
    setSelectedDate,
    closeDay,
  };
}
