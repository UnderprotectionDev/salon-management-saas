"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, ChevronsUpDown, Loader2, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentStaff } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";

type CreateAppointmentDialogProps = {
  organizationId: Id<"organization">;
  date: string;
};

function getNearestQuarterHour(): string {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  return String(Math.max(360, Math.min(rounded, 1320))); // Clamp to 06:00–22:00
}

export function CreateAppointmentDialog({
  organizationId,
  date,
}: CreateAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentStaff = useCurrentStaff();

  // Form state
  const [customerId, setCustomerId] = useState<Id<"customers"> | "">("");
  const [staffId, setStaffId] = useState<Id<"staff"> | "">("");
  const [serviceIds, setServiceIds] = useState<Id<"services">[]>([]);
  const [startTime, setStartTime] = useState("");
  const [source, setSource] = useState<"walk_in" | "phone" | "staff">(
    "walk_in",
  );
  const [notes, setNotes] = useState("");

  // Customer selection state
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");

  // New customer inline form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

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
  const createCustomer = useMutation(api.customers.create);

  // Default staff to current user's staff profile
  useEffect(() => {
    if (open && currentStaff && !staffId) {
      setStaffId(currentStaff._id);
    }
  }, [open, currentStaff, staffId]);

  // Default start time to nearest quarter hour
  useEffect(() => {
    if (open && !startTime) {
      setStartTime(getNearestQuarterHour());
    }
  }, [open, startTime]);

  const resetForm = () => {
    setCustomerId("");
    setStaffId("");
    setServiceIds([]);
    setStartTime("");
    setSource("walk_in");
    setNotes("");
    setSelectedCustomerLabel("");
    setShowNewCustomer(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
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

  const handleSelectCustomer = (customer: {
    _id: Id<"customers">;
    name: string;
    phone: string;
  }) => {
    setCustomerId(customer._id);
    setSelectedCustomerLabel(`${customer.name} — ${customer.phone}`);
    setCustomerComboOpen(false);
    setShowNewCustomer(false);
  };

  const handleSubmit = async () => {
    // If creating inline customer
    let finalCustomerId = customerId;
    if (showNewCustomer && !customerId) {
      if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
        toast.error("Name and phone are required");
        return;
      }
      try {
        const newId = await createCustomer({
          organizationId,
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim() || undefined,
          source: "walk_in",
        });
        finalCustomerId = newId;
      } catch (error: unknown) {
        const msg =
          (error as { data?: { message?: string } })?.data?.message ??
          "Failed to create customer";
        toast.error(msg);
        return;
      }
    }

    if (!finalCustomerId || !staffId || serviceIds.length === 0 || !startTime) {
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
        customerId: finalCustomerId as Id<"customers">,
        source,
        staffNotes: notes || undefined,
      });
      toast.success(`Appointment created: ${result.confirmationCode}`);
      setOpen(false);
      resetForm();
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to create appointment";
      toast.error(msg);
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
          {/* Customer - Combobox */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            {selectedCustomerLabel && !showNewCustomer ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border px-3 py-2 text-sm">
                  {selectedCustomerLabel}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomerId("");
                    setSelectedCustomerLabel("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : showNewCustomer ? (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Customer</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewCustomer(false);
                      setNewCustomerName("");
                      setNewCustomerPhone("");
                      setNewCustomerEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Name *"
                />
                <Input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+90 5XX XXX XX XX *"
                />
                <Input
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="Email (optional)"
                />
              </div>
            ) : (
              <Popover
                open={customerComboOpen}
                onOpenChange={setCustomerComboOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerComboOpen}
                    className="w-full justify-between"
                  >
                    Select customer...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search name or phone..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer._id}
                            value={`${customer.name} ${customer.phone}`}
                            onSelect={() => handleSelectCustomer(customer)}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                customerId === customer._id
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {customer.phone}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setShowNewCustomer(true);
                            setCustomerComboOpen(false);
                          }}
                          className="border-t"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create new customer
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
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
                Select staff first
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
            <Select
              value={source}
              onValueChange={(v: string) =>
                setSource(v as "walk_in" | "phone" | "staff")
              }
            >
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
