"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

function liraToKurus(lira: string | number): number {
  const parsed = typeof lira === "string" ? parseFloat(lira) : lira;
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function kurusToLira(kurus: number): string {
  return (kurus / 100).toFixed(2);
}

type Product = {
  _id: Id<"products">;
  name: string;
  description?: string;
  categoryId?: Id<"productCategories">;
  sku?: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  status: "active" | "inactive";
  supplierInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
};

type CategoryOption = {
  _id: Id<"productCategories">;
  name: string;
  status: "active" | "inactive";
};

type EditProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  organizationId: Id<"organization">;
};

export function EditProductDialog({
  open,
  onOpenChange,
  product,
  organizationId,
}: EditProductDialogProps) {
  const updateProduct = useMutation(api.products.update);
  const categories = useQuery(api.productCategories.list, {
    organizationId,
  }) as CategoryOption[] | undefined;

  const activeCategories =
    categories?.filter((c) => c.status === "active") ?? [];

  const form = useForm({
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? ("" as string),
      sku: product?.sku ?? "",
      brand: product?.brand ?? "",
      costPrice: product ? kurusToLira(product.costPrice) : "",
      sellingPrice: product ? kurusToLira(product.sellingPrice) : "",
      lowStockThreshold: product?.lowStockThreshold?.toString() ?? "",
      status: product?.status ?? ("active" as "active" | "inactive"),
      supplierName: product?.supplierInfo?.name ?? "",
      supplierPhone: product?.supplierInfo?.phone ?? "",
      supplierEmail: product?.supplierInfo?.email ?? "",
      supplierNotes: product?.supplierInfo?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      if (!product) return;
      try {
        const hasSupplier =
          value.supplierName ||
          value.supplierPhone ||
          value.supplierEmail ||
          value.supplierNotes;

        await updateProduct({
          organizationId,
          productId: product._id,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          categoryId:
            value.categoryId && value.categoryId !== "none"
              ? (value.categoryId as Id<"productCategories">)
              : undefined,
          sku: value.sku.trim() || undefined,
          brand: value.brand.trim() || undefined,
          costPrice: liraToKurus(value.costPrice || "0"),
          sellingPrice: liraToKurus(value.sellingPrice),
          lowStockThreshold: value.lowStockThreshold
            ? parseInt(value.lowStockThreshold, 10)
            : undefined,
          status: value.status,
          supplierInfo: hasSupplier
            ? {
                name: value.supplierName.trim() || undefined,
                phone: value.supplierPhone.trim() || undefined,
                email: value.supplierEmail.trim() || undefined,
                notes: value.supplierNotes.trim() || undefined,
              }
            : undefined,
        });
        onOpenChange(false);
        toast.success("Product updated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update product",
        );
      }
    },
  });

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
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
                  />
                  <FieldError
                    errors={field.state.meta.errors.map((e) => ({
                      message: String(e),
                    }))}
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={2}
                  />
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="categoryId">
                {(field) => (
                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      value={field.state.value || "none"}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger>
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
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="sku">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>SKU</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="status">
                {(field) => (
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) =>
                        field.handleChange(v as "active" | "inactive")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="costPrice">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Cost Price (₺)</FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      min="0"
                      step="0.01"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="sellingPrice"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value) return "Selling price is required";
                    const parsed = parseFloat(value);
                    if (Number.isNaN(parsed) || parsed < 0)
                      return "Selling price must be a valid non-negative number";
                    return undefined;
                  },
                  onSubmit: ({ value }) => {
                    if (!value) return "Selling price is required";
                    const parsed = parseFloat(value);
                    if (Number.isNaN(parsed) || parsed < 0)
                      return "Selling price must be a valid non-negative number";
                    return undefined;
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

            <form.Field name="lowStockThreshold">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Low Stock Alert Threshold
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

            <Separator />

            <p className="text-sm font-medium">Supplier Info</p>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="supplierName">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Supplier Name</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
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
                  />
                </Field>
              )}
            </form.Field>

            <form.Field name="supplierNotes">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={2}
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
