"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

export function AddRevenueButton() {
  const { activeOrganization } = useOrganization();
  const createItem = useMutation(api.additionalRevenue.create);
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!activeOrganization || loading) return;
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await createItem({
        organizationId: activeOrganization._id,
        date: todayStr,
        type: "other",
        amount: 0,
        paymentMethod: "cash",
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
      Add Revenue
    </Button>
  );
}
