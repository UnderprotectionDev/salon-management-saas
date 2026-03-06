"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { toast } from "sonner";
import { z } from "zod";
import { RichEditor } from "@/components/rich-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { liraToKurus } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AddCategoryPopover } from "./AddCategoryPopover";

type AddServiceSheetProps = {
  organizationId: Id<"organization">;
  defaultCategoryId?: Id<"serviceCategories">;
  onSuccess?: () => void;
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

export function AddServiceSheet({
  organizationId,
  defaultCategoryId,
  onSuccess,
}: AddServiceSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<Id<"staff">>>(
    new Set(),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const createService = useMutation(api.services.create);
  const assignStaff = useMutation(api.services.assignStaff);
  const categories = useQuery(api.serviceCategories.list, { organizationId });
  const allStaff = useQuery(api.staff.list, { organizationId });
  const avatarConfigs = useQuery(api.staff.getAvatarConfigs, {
    organizationId,
  });

  const avatarConfigMap = new Map(
    avatarConfigs?.map((a) => [a.staffId, a.avatarConfig]) ?? [],
  );

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: (defaultCategoryId ?? "none") as string,
      duration: 30,
      bufferTime: 0,
      price: 0,
      priceType: "fixed" as "fixed" | "starting_from" | "variable",
      showOnline: true,
    },
    onSubmit: async ({ value }) => {
      try {
        const serviceId = await createService({
          organizationId,
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

        if (selectedStaffIds.size > 0) {
          const failedStaff: string[] = [];
          for (const staffId of selectedStaffIds) {
            try {
              await assignStaff({
                organizationId,
                serviceId,
                staffId,
                assign: true,
              });
            } catch {
              const staffMember = allStaff?.find((s) => s._id === staffId);
              failedStaff.push(staffMember?.name ?? "Unknown");
            }
          }
          if (failedStaff.length > 0) {
            toast.warning(
              `Service created but staff assignment failed for: ${failedStaff.join(", ")}. Edit the service to retry.`,
            );
          }
        }

        setOpen(false);
        form.reset();
        setSelectedStaffIds(new Set());
        setAdvancedOpen(false);
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create service. Please try again.";
        toast.error(message);
      }
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setSelectedStaffIds(new Set());
      setAdvancedOpen(false);
    }
  };

  const toggleStaff = (staffId: Id<"staff">) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  };

  const activeStaff = allStaff?.filter((s) => s.status === "active");

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Service
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
          <SheetTitle>Add Service</SheetTitle>
          <SheetDescription>
            Create a new service for your salon
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
                          placeholder="e.g. Haircut, Manicure"
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
                      <RichEditor
                        id={field.name}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        placeholder="Brief description of the service"
                        disabled={form.state.isSubmitting}
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
                <Separator />
                <div className="space-y-2">
                  <Label>Assign Staff</Label>
                  {allStaff === undefined ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : activeStaff && activeStaff.length > 0 ? (
                    <div className="space-y-1">
                      {activeStaff.map((staff) => {
                        const config = avatarConfigMap.get(staff._id);
                        return (
                          <label
                            key={staff._id}
                            className="flex items-center gap-3 rounded-md p-2 hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedStaffIds.has(staff._id)}
                              onCheckedChange={() => toggleStaff(staff._id)}
                              disabled={form.state.isSubmitting}
                            />
                            <Avatar className="size-7">
                              <AvatarImage src={staff.imageUrl ?? undefined} />
                              <AvatarFallback>
                                <NiceAvatar
                                  style={{ width: "100%", height: "100%" }}
                                  shape="circle"
                                  {...(config ?? genConfig(staff._id))}
                                />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate">
                              {staff.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No active staff members
                    </p>
                  )}
                </div>

                {/* Advanced Settings */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
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
                            <Label htmlFor="showOnline">Show Online</Label>
                            <p className="text-xs text-muted-foreground">
                              Visible in online booking
                            </p>
                          </div>
                          <Switch
                            id="showOnline"
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
              onClick={() => setOpen(false)}
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Service"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
