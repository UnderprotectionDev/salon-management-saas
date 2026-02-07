"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatPhoneInput, turkishPhoneSchema } from "../lib/phone";

type EditCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: Id<"customers"> | null;
  organizationId: Id<"organization">;
};

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

const emailSchema = z
  .string()
  .email("Please enter a valid email")
  .or(z.literal(""));

export function EditCustomerDialog({
  open,
  onOpenChange,
  customerId,
  organizationId,
}: EditCustomerDialogProps) {
  const updateCustomer = useMutation(api.customers.update);

  // Fetch full customer data
  const customer = useQuery(
    api.customers.get,
    open && customerId ? { organizationId, customerId } : "skip",
  );

  const staffList = useQuery(
    api.staff.list,
    open ? { organizationId } : "skip",
  );

  const form = useForm({
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      preferredStaffId: (customer?.preferredStaffId ?? "") as string,
      customerNotes: customer?.customerNotes ?? "",
      staffNotes: customer?.staffNotes ?? "",
      tags: customer?.tags?.join(", ") ?? "",
    },
    onSubmit: async ({ value }) => {
      if (!customer) return;
      try {
        await updateCustomer({
          organizationId,
          customerId: customer._id,
          name: value.name,
          phone: value.phone,
          email: value.email || undefined,
          preferredStaffId:
            value.preferredStaffId && value.preferredStaffId !== "none"
              ? (value.preferredStaffId as Id<"staff">)
              : undefined,
          customerNotes: value.customerNotes || undefined,
          staffNotes: value.staffNotes || undefined,
          tags: value.tags
            ? value.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
        });
        onOpenChange(false);
        const { toast } = await import("sonner");
        toast.success("Customer updated");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update customer. Please try again.";
        const { toast } = await import("sonner");
        toast.error(message);
      }
    },
  });

  // Update form values when customer data is loaded
  useEffect(() => {
    if (customer && customer !== null) {
      form.reset();
      form.setFieldValue("name", customer.name);
      form.setFieldValue("phone", customer.phone);
      form.setFieldValue("email", customer.email ?? "");
      form.setFieldValue(
        "preferredStaffId",
        (customer.preferredStaffId ?? "") as string,
      );
      form.setFieldValue("customerNotes", customer.customerNotes ?? "");
      form.setFieldValue("staffNotes", customer.staffNotes ?? "");
      form.setFieldValue("tags", customer.tags?.join(", ") ?? "");
    }
  }, [customer, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              validators={{
                onBlur: nameSchema,
                onSubmit: nameSchema,
              }}
            >
              {(field) => {
                const hasError =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={hasError || undefined}>
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={form.state.isSubmitting}
                      aria-invalid={hasError}
                    />
                    {hasError && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="phone"
              validators={{
                onBlur: turkishPhoneSchema,
                onSubmit: turkishPhoneSchema,
              }}
            >
              {(field) => {
                const hasError =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={hasError || undefined}>
                    <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="tel"
                      placeholder="+90 5XX XXX XX XX"
                      value={field.state.value}
                      onBlur={(e) => {
                        field.handleChange(formatPhoneInput(e.target.value));
                        field.handleBlur();
                      }}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={form.state.isSubmitting}
                      aria-invalid={hasError}
                    />
                    {hasError && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onBlur: emailSchema,
                onSubmit: emailSchema,
              }}
            >
              {(field) => {
                const hasError =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={hasError || undefined}>
                    <FieldLabel htmlFor={field.name}>
                      Email (optional)
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={form.state.isSubmitting}
                      aria-invalid={hasError}
                    />
                    {hasError && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="preferredStaffId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Preferred Staff (optional)
                  </FieldLabel>
                  <Select
                    value={field.state.value || "none"}
                    onValueChange={(value) =>
                      field.handleChange(value === "none" ? "" : value)
                    }
                    disabled={form.state.isSubmitting}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      {staffList?.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field name="customerNotes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Customer Notes (optional)
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    rows={2}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="staffNotes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Staff Notes (optional)
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    placeholder="Internal notes visible only to staff..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    rows={2}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Tags (optional)</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="VIP, Regular, New (comma-separated)"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                  />
                </Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.errors}>
              {(errors) =>
                errors.length > 0 && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {errors.map((e) => String(e)).join(", ")}
                  </div>
                )
              }
            </form.Subscribe>
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
