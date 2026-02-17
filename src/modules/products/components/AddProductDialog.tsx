"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type CategoryOption = {
  _id: Id<"productCategories">;
  name: string;
  status: "active" | "inactive";
};

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");
const priceSchema = z.number().min(0, "Price cannot be negative");
const stockSchema = z.number().int().min(0, "Stock cannot be negative");

type AddProductDialogProps = {
  organizationId: Id<"organization">;
  defaultCategoryId?: Id<"productCategories">;
};

/** Convert lira string (e.g. "150.00") to kuruş integer */
function liraToKurus(lira: string | number): number {
  const parsed = typeof lira === "string" ? parseFloat(lira) : lira;
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function AddProductDialog({
  organizationId,
  defaultCategoryId,
}: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const createProduct = useMutation(api.products.create);
  const categories = useQuery(api.productCategories.list, {
    organizationId,
  }) as CategoryOption[] | undefined;

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: (defaultCategoryId ?? "") as string,
      sku: "",
      brand: "",
      costPrice: "",
      sellingPrice: "",
      stockQuantity: "0",
      lowStockThreshold: "",
      supplierName: "",
      supplierPhone: "",
      supplierEmail: "",
      supplierNotes: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const costKurus = liraToKurus(value.costPrice || "0");
        const sellKurus = liraToKurus(value.sellingPrice);
        const stock = parseInt(value.stockQuantity, 10) || 0;
        const threshold = value.lowStockThreshold
          ? parseInt(value.lowStockThreshold, 10)
          : undefined;

        const hasSupplier =
          value.supplierName ||
          value.supplierPhone ||
          value.supplierEmail ||
          value.supplierNotes;

        await createProduct({
          organizationId,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          categoryId:
            value.categoryId && value.categoryId !== "none"
              ? (value.categoryId as Id<"productCategories">)
              : undefined,
          sku: value.sku.trim() || undefined,
          brand: value.brand.trim() || undefined,
          costPrice: costKurus,
          sellingPrice: sellKurus,
          stockQuantity: stock,
          lowStockThreshold: threshold,
          supplierInfo: hasSupplier
            ? {
                name: value.supplierName.trim() || undefined,
                phone: value.supplierPhone.trim() || undefined,
                email: value.supplierEmail.trim() || undefined,
                notes: value.supplierNotes.trim() || undefined,
              }
            : undefined,
        });

        setOpen(false);
        form.reset();
        toast.success("Product created");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create product",
        );
      }
    },
  });

  const activeCategories =
    categories?.filter((c) => c.status === "active") ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="py-4">
            {/* Name */}
            <form.Field
              name="name"
              validators={{
                onBlur: ({ value }) => {
                  const r = nameSchema.safeParse(value);
                  return r.success ? undefined : r.error.issues[0]?.message;
                },
                onSubmit: ({ value }) => {
                  const r = nameSchema.safeParse(value);
                  return r.success ? undefined : r.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Name *</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g. Kerastase Shampoo"
                  />
                  <FieldError
                    errors={field.state.meta.errors.map((e) => ({
                      message: String(e),
                    }))}
                  />
                </Field>
              )}
            </form.Field>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={2}
                    placeholder="Short product description"
                  />
                </Field>
              )}
            </form.Field>

            {/* Category + Brand row */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="categoryId">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {activeCategories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>

              <form.Field name="brand">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Brand</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. Kerastase"
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            {/* SKU */}
            <form.Field name="sku">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    SKU{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. KER-SH-001"
                  />
                </Field>
              )}
            </form.Field>

            <Separator />

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="costPrice"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value) return undefined;
                    const r = priceSchema.safeParse(parseFloat(value));
                    return r.success ? undefined : r.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={field.name}>Cost Price (₺)</FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      min="0"
                      step="0.01"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="0.00"
                    />
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: String(e),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="sellingPrice"
                validators={{
                  onBlur: ({ value }) => {
                    const r = priceSchema.safeParse(parseFloat(value));
                    return r.success ? undefined : r.error.issues[0]?.message;
                  },
                  onSubmit: ({ value }) => {
                    if (!value) return "Selling price is required";
                    const r = priceSchema.safeParse(parseFloat(value));
                    return r.success ? undefined : r.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={field.name}>
                      Selling Price (₺) *
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      min="0"
                      step="0.01"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="0.00"
                    />
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: String(e),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <Separator />

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="stockQuantity"
                validators={{
                  onBlur: ({ value }) => {
                    const r = stockSchema.safeParse(parseInt(value, 10));
                    return r.success ? undefined : r.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={field.name}>
                      Initial Stock *
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      min="0"
                      step="1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: String(e),
                      }))}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="lowStockThreshold">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Low Stock Alert
                    </FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      min="0"
                      step="1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <Separator />

            {/* Supplier */}
            <p className="text-sm font-medium">
              Supplier Info{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="supplierName">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Supplier Name</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Company name"
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="supplierPhone">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="+90 5XX XXX XX XX"
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="supplierEmail">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Supplier Email</FieldLabel>
                  <Input
                    id={field.name}
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="supplier@example.com"
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="supplierNotes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Supplier Notes</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={2}
                    placeholder="Payment terms, contact notes, etc."
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Create Product
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
