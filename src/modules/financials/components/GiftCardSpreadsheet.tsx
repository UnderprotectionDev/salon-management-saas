"use client";

import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/modules/organization";
import { liraToKurus } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";

export function CreateGiftCardDialog() {
  const { activeOrganization } = useOrganization();
  const createCard = useMutation(api.giftCards.create);
  const [open, setOpen] = useState(false);
  const [purchaserName, setPurchaserName] = useState("");
  const [amount, setAmount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!activeOrganization || loading) return;
    const amountKurus = liraToKurus(Number.parseFloat(amount));
    if (Number.isNaN(amountKurus) || amountKurus <= 0) return;

    setLoading(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      await createCard({
        organizationId: activeOrganization._id,
        purchaseDate: todayStr,
        purchaserName: purchaserName || undefined,
        amount: amountKurus,
        expiryDate: expiryDate || undefined,
      });

      setOpen(false);
      setPurchaserName("");
      setAmount("");
      setExpiryDate("");
    } catch {
      // Mutation error surfaced by Convex
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 size-3.5" />
          New Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Gift Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Purchaser Name</Label>
            <Input
              value={purchaserName}
              onChange={(e) => setPurchaserName(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label>Amount (TRY)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
