"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { liraToKurus } from "../lib/currency";

type AddServiceDialogProps = {
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

export function AddServiceDialog({
  organizationId,
  defaultCategoryId,
  onSuccess,
}: AddServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const createService = useMutation(api.services.create);
  const categories = useQuery(api.serviceCategories.list, { organizationId });

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: (defaultCategoryId ?? "") as string,
      duration: 30,
      bufferTime: 0,
      price: 0,
      priceType: "fixed" as "fixed" | "starting_from" | "variable",
    },
    onSubmit: async ({ value }) => {
      try {
        await createService({
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
        setOpen(false);
        form.reset();
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create service. Please try again.";
        const { toast } = await import("sonner");
        toast.error(message);
      }
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>
            Create a new service for your salon
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
                  <Textarea
                    id={field.name}
                    name={field.name}
                    placeholder="Brief description of the service"
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
                    value={field.state.value}
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
