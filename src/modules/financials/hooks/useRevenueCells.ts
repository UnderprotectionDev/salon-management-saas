"use client";

import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { mapRevenueToCells } from "../lib/cell-mappers";
import type { CellMap } from "../lib/spreadsheet-types";

interface UseRevenueCellsResult {
  cells: CellMap;
  readOnlyCells: Set<string>;
  editHandlers: Record<string, (newValue: string) => void>;
  loading: boolean;
}

export function useRevenueCells(
  from: string,
  to: string,
): UseRevenueCellsResult {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?._id;

  const items = useQuery(
    api.additionalRevenue.list,
    orgId
      ? { organizationId: orgId, startDate: from, endDate: to }
      : "skip",
  );

  // Optimistic update: patch local query cache when mutation fires
  const updateField = useMutation(
    api.additionalRevenue.updateField,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.additionalRevenue.list, {
      organizationId: args.organizationId,
      startDate: from,
      endDate: to,
    });
    if (current === undefined) return;

    const updated = current.map((r) =>
      r._id === args.id ? { ...r, [args.field]: args.value } : r,
    );
    localStore.setQuery(
      api.additionalRevenue.list,
      { organizationId: args.organizationId, startDate: from, endDate: to },
      updated,
    );
  });

  if (!items || !activeOrganization) {
    return {
      cells: {},
      readOnlyCells: new Set(),
      editHandlers: {},
      loading: !items,
    };
  }

  function onFieldChange(
    id: Id<"additionalRevenue">,
    field: string,
    value: unknown,
  ) {
    if (!activeOrganization) return;
    updateField({
      organizationId: activeOrganization._id,
      id,
      field,
      value,
    });
  }

  const result = mapRevenueToCells(items, onFieldChange);
  return { ...result, loading: false };
}
