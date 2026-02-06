"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { kurusToLira, liraToKurus } from "../lib/currency";
import { StaffAssignmentSelect } from "./StaffAssignmentSelect";

type ServiceData = {
  _id: Id<"services">;
  name: string;
  description?: string;
  categoryId?: Id<"serviceCategories">;
  duration: number;
  bufferTime?: number;
  price: number;
  priceType: "fixed" | "starting_from" | "variable";
  isPopular: boolean;
  status: "active" | "inactive";
  showOnline: boolean;
};

type EditServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceData | null;
  organizationId: Id<"organization">;
};

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

const durationSchema = z
  .number()
  .min(5, "Duration must be at least 5 minutes")
  .max(480, "Duration cannot exceed 8 hours");

const priceSchema = z.number().min(0, "Price cannot be negative");

export function EditServiceDialog({
  open,
  onOpenChange,
  service,
  organizationId,
}: EditServiceDialogProps) {
  const updateService = useMutation(api.services.update);
  const categories = useQuery(api.serviceCategories.list, { organizationId });

  const form = useForm({
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      categoryId: (service?.categoryId ?? "") as string,
      duration: service?.duration ?? 30,
      bufferTime: service?.bufferTime ?? 0,
      price: service ? kurusToLira(service.price) : 0,
      priceType: (service?.priceType ?? "fixed") as
        | "fixed"
        | "starting_from"
        | "variable",
    },
    onSubmit: async ({ value }) => {
      if (!service) return;
      try {
        await updateService({
          organizationId,
          serviceId: service._id,
          name: value.name,
          description: value.description || undefined,
          categoryId:
            value.categoryId && value.categoryId !== "none"
              ? (value.categoryId as Id<"serviceCategories">)
              : undefined,
          duration: value.duration,
          bufferTime: value.bufferTime || undefined,
          price: liraToKurus(value.price),
          priceType: value.priceType,
        });
        onOpenChange(false);
        const { toast } = await import("sonner");
        toast.success("Service updated");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update service. Please try again.";
        const { toast } = await import("sonner");
        toast.error(message);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={service?._id}
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Update service details and staff assignments
          </DialogDescription>
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
                    <FieldLabel htmlFor={field.name}>Service Name</FieldLabel>
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

            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Description (optional)
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

            <form.Field name="categoryId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                  <Select
                    value={field.state.value || "none"}
                    onValueChange={(value) => field.handleChange(value)}
                    disabled={form.state.isSubmitting}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="duration"
                validators={{
                  onBlur: durationSchema,
                  onSubmit: durationSchema,
                }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        Duration (min)
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={5}
                        max={480}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
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

              <form.Field name="bufferTime">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Buffer (min)</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min={0}
                      max={60}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      disabled={form.state.isSubmitting}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="price"
                validators={{
                  onBlur: priceSchema,
                  onSubmit: priceSchema,
                }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor={field.name}>Price (TL)</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={0}
                        step={0.01}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
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

              <form.Field name="priceType">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Price Type</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(
                        value: "fixed" | "starting_from" | "variable",
                      ) => field.handleChange(value)}
                      disabled={form.state.isSubmitting}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="starting_from">
                          Starting from
                        </SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            </div>

            {service && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Assigned Staff</Label>
                  <StaffAssignmentSelect
                    organizationId={organizationId}
                    serviceId={service._id}
                  />
                </div>
              </>
            )}

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
