"use client";

import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { mapExpensesToCells } from "../lib/cell-mappers";
import type { CellMap } from "../lib/spreadsheet-types";

interface UseExpensesCellsResult {
  cells: CellMap;
  readOnlyCells: Set<string>;
  editHandlers: Record<string, (newValue: string) => void>;
  loading: boolean;
}

export function useExpensesCells(
  from: string,
  to: string,
): UseExpensesCellsResult {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?._id;

  const expenses = useQuery(
    api.expenses.list,
    orgId
      ? { organizationId: orgId, startDate: from, endDate: to }
      : "skip",
  );

  // Optimistic update: patch local query cache when mutation fires
  const updateField = useMutation(
    api.expenses.updateField,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.expenses.list, {
      organizationId: args.organizationId,
      startDate: from,
      endDate: to,
    });
    if (current === undefined) return;

    const updated = current.map((e) =>
      e._id === args.id ? { ...e, [args.field]: args.value } : e,
    );
    localStore.setQuery(
      api.expenses.list,
      { organizationId: args.organizationId, startDate: from, endDate: to },
      updated,
    );
  });

  if (!expenses || !activeOrganization) {
    return {
      cells: {},
      readOnlyCells: new Set(),
      editHandlers: {},
      loading: !expenses,
    };
  }

  function onFieldChange(id: Id<"expenses">, field: string, value: unknown) {
    if (!activeOrganization) return;
    updateField({
      organizationId: activeOrganization._id,
      id,
      field,
      value,
    });
  }

  const result = mapExpensesToCells(expenses, onFieldChange);
  return { ...result, loading: false };
}
