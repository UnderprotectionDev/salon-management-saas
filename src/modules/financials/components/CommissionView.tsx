"use client";

import { useMutation, useQuery } from "convex/react";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function CommissionSettingsButton() {
  const { activeOrganization } = useOrganization();
  const staffList = useQuery(
    api.staff.list,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );
  const settings = useQuery(
    api.commissionSettings.listByOrg,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );
  return (
    <CommissionSettingsDialog
      staffList={staffList ?? []}
      settings={settings ?? []}
    />
  );
}

function CommissionSettingsDialog({
  staffList,
  settings,
}: {
  staffList: Array<{ _id: Id<"staff">; name: string }>;
  settings: Array<{
    _id: Id<"commissionSettings">;
    staffId: Id<"staff">;
    model: "fixed" | "tiered";
    fixedRate?: number;
  }>;
}) {
  const { activeOrganization } = useOrganization();
  const upsert = useMutation(api.commissionSettings.upsert);
  const [selectedStaff, setSelectedStaff] = useState<Id<"staff"> | "">("");
  const [model, setModel] = useState<"fixed" | "tiered">("fixed");
  const [rate, setRate] = useState("40");
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!activeOrganization || !selectedStaff || loading) return;
    setLoading(true);
    try {
      await upsert({
        organizationId: activeOrganization._id,
        staffId: selectedStaff as Id<"staff">,
        model,
        fixedRate: model === "fixed" ? Number(rate) : undefined,
        tiers:
          model === "tiered"
            ? [{ minRevenue: 0, rate: Number(rate) }]
            : undefined,
      });
      setOpen(false);
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
          <Settings2 className="mr-1 size-3.5" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commission Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {settings.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Current Settings</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <div className="space-y-1 text-xs">
                  {settings.map((s) => {
                    const staff = staffList.find((st) => st._id === s.staffId);
                    return (
                      <div key={s._id} className="flex justify-between">
                        <span>{staff?.name ?? "Unknown"}</span>
                        <span>
                          {s.model === "fixed" && s.fixedRate != null ? `${s.fixedRate}%` : "Tiered"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Staff Member</Label>
              <Select
                value={selectedStaff}
                onValueChange={(val) => setSelectedStaff(val as Id<"staff">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Model</Label>
              <Select
                value={model}
                onValueChange={(val) => setModel(val as "fixed" | "tiered")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Rate</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">
                {model === "fixed" ? "Commission Rate (%)" : "Base Rate (%)"}
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!selectedStaff || loading}
              className="w-full"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
