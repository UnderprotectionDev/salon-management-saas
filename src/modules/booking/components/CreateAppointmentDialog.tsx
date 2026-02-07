"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";

type CreateAppointmentDialogProps = {
  organizationId: Id<"organization">;
  date: string;
};

export function CreateAppointmentDialog({
  organizationId,
  date,
}: CreateAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState<Id<"customers"> | "">("");
  const [staffId, setStaffId] = useState<Id<"staff"> | "">("");
  const [serviceIds, setServiceIds] = useState<Id<"services">[]>([]);
  const [startTime, setStartTime] = useState("");
  const [source, setSource] = useState<"walk_in" | "phone" | "staff">(
    "walk_in",
  );
  const [notes, setNotes] = useState("");

  // Queries
  const customers = useQuery(
    api.customers.list,
    open ? { organizationId } : "skip",
  );
  const staff = useQuery(
    api.staff.listActive,
    open ? { organizationId } : "skip",
  );
  const services = useQuery(
    api.services.list,
    open ? { organizationId, status: "active" } : "skip",
  );

  const createByStaff = useMutation(api.appointments.createByStaff);

  const resetForm = () => {
    setCustomerId("");
    setStaffId("");
    setServiceIds([]);
    setStartTime("");
    setSource("walk_in");
    setNotes("");
  };

  const toggleService = (id: Id<"services">) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  // Generate time options (15-min increments from 06:00 to 22:00)
  const timeOptions: { value: number; label: string }[] = [];
  for (let m = 360; m <= 1320; m += 15) {
    timeOptions.push({ value: m, label: formatMinutesAsTime(m) });
  }

  const handleSubmit = async () => {
    if (!customerId || !staffId || serviceIds.length === 0 || !startTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createByStaff({
        organizationId,
        staffId: staffId as Id<"staff">,
        date,
        startTime: Number(startTime),
        serviceIds,
        customerId: customerId as Id<"customers">,
        source,
        staffNotes: notes || undefined,
      });
      toast.success(`Appointment created: ${result.confirmationCode}`);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={customerId}
              onValueChange={(v) => setCustomerId(v as Id<"customers">)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name} - {c.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff */}
          <div className="space-y-2">
            <Label>Staff *</Label>
            <Select
              value={staffId}
              onValueChange={(v) => {
                setStaffId(v as Id<"staff">);
                setServiceIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label>Services *</Label>
            {!staffId && (
              <p className="text-sm text-muted-foreground">
                Select a staff member first
              </p>
            )}
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-3">
              {services
                ?.filter((s) => {
                  if (s.status !== "active") return false;
                  if (!staffId) return false;
                  const selectedStaff = staff?.find((st) => st._id === staffId);
                  return selectedStaff?.serviceIds?.includes(s._id) ?? false;
                })
                .map((service) => (
                  <label
                    key={service._id}
                    className="flex items-center gap-3 py-1.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={serviceIds.includes(service._id)}
                      onCheckedChange={() => toggleService(service._id)}
                    />
                    <span className="flex-1 text-sm">{service.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {service.duration}min · {formatPrice(service.price)}
                    </span>
                  </label>
                ))}
            </div>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Start Time *</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((t) => (
                  <SelectItem key={t.value} value={String(t.value)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v: any) => setSource(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Staff notes..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Appointment"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
