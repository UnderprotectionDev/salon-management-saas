"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { kurusToLira, liraToKurus } from "../lib/currency";
import { AddCategoryPopover } from "./AddCategoryPopover";
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

type EditServiceSheetProps = {
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

export function EditServiceSheet({
  open,
  onOpenChange,
  service,
  organizationId,
}: EditServiceSheetProps) {
  const updateService = useMutation(api.services.update);
  const categories = useQuery(api.serviceCategories.list, { organizationId });

  const form = useForm({
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      categoryId: (service?.categoryId ?? "none") as string,
      duration: service?.duration ?? 30,
      bufferTime: service?.bufferTime ?? 0,
      price: service ? kurusToLira(service.price) : 0,
      priceType: (service?.priceType ?? "fixed") as
        | "fixed"
        | "starting_from"
        | "variable",
      showOnline: service?.showOnline ?? true,
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
        toast.success("Service updated");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update service. Please try again.";
        toast.error(message);
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        key={service?._id}
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <SheetTitle>Edit Service</SheetTitle>
          <SheetDescription>
            Update service details and staff assignments
          </SheetDescription>
        </SheetHeader>

        <Separator className="mt-4 shrink-0" />

        <form
          className="flex flex-col flex-1 min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4">
              <FieldGroup>
                {/* Basic Info */}
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
                        <FieldLabel htmlFor={field.name}>
                          Service Name
                        </FieldLabel>
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
                      <div className="flex items-center gap-2">
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value)}
                          disabled={form.state.isSubmitting}
                        >
                          <SelectTrigger id={field.name} className="flex-1">
                            <SelectValue placeholder="No category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No category</SelectItem>
                            {categories?.map((category) => (
                              <SelectItem
                                key={category._id}
                                value={category._id}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AddCategoryPopover
                          organizationId={organizationId}
                          variant="inline"
                          onCreated={(categoryId) =>
                            field.handleChange(categoryId)
                          }
                        />
                      </div>
                    </Field>
                  )}
                </form.Field>

                {/* Duration & Price side by side */}
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
                          <FieldLabel htmlFor={field.name}>
                            Price (TL)
                          </FieldLabel>
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
                </div>

                {/* Staff Assignment */}
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

                {/* Advanced Settings */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                    >
                      Advanced Settings
                      <ChevronsUpDown className="size-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <form.Field name="bufferTime">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Buffer Time (min)
                          </FieldLabel>
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
                          <p className="text-xs text-muted-foreground">
                            Break time between appointments
                          </p>
                        </Field>
                      )}
                    </form.Field>

                    <form.Field name="priceType">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Price Type
                          </FieldLabel>
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

                    <form.Field name="showOnline">
                      {(field) => (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <Label htmlFor="showOnline-edit">Show Online</Label>
                            <p className="text-xs text-muted-foreground">
                              Visible in online booking
                            </p>
                          </div>
                          <Switch
                            id="showOnline-edit"
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked)
                            }
                            disabled={form.state.isSubmitting}
                          />
                        </div>
                      )}
                    </form.Field>
                  </CollapsibleContent>
                </Collapsible>

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
            </div>
          </ScrollArea>

          <Separator className="shrink-0" />
          <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0">
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
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
