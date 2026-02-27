"use client";

import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function AddExpenseButton() {
  const { activeOrganization } = useOrganization();
  const createExpense = useMutation(api.expenses.create);
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!activeOrganization || loading) return;
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await createExpense({
        organizationId: activeOrganization._id,
        date: todayStr,
        category: "other",
        amount: 0,
        paymentMethod: "cash",
        recurrence: "one_time",
        taxIncluded: true,
      });
    } catch {
      // Mutation error surfaced by Convex
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleAdd} disabled={loading}>
      <Plus className="mr-1 size-3.5" />
      Add Expense
    </Button>
  );
}

export function ExpenseBulkDeleteButton({
  selectedRows,
  onDeleted,
}: {
  selectedRows: Set<string>;
  onDeleted: () => void;
}) {
  const { activeOrganization } = useOrganization();
  const bulkDeleteMutation = useMutation(api.expenses.bulkDelete);
  const [loading, setLoading] = useState(false);

  if (selectedRows.size === 0) return null;

  async function handleDelete() {
    if (!activeOrganization || selectedRows.size === 0 || loading) return;
    setLoading(true);
    try {
      await bulkDeleteMutation({
        organizationId: activeOrganization._id,
        ids: Array.from(selectedRows) as Id<"expenses">[],
      });
      onDeleted();
    } catch {
      // Mutation error surfaced by Convex
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="mr-1 size-3.5" />
      Delete ({selectedRows.size})
    </Button>
  );
}
