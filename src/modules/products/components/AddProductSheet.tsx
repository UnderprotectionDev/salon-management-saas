"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { liraToKurus } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddProductCategoryPopover } from "./AddProductCategoryPopover";
import { ProductMultiImageUpload } from "./ProductMultiImageUpload";
import {
  type VariantOption,
  VariantOptionsEditor,
} from "./VariantOptionsEditor";

type AddProductSheetProps = {
  organizationId: Id<"organization">;
  defaultCategoryId?: Id<"productCategories">;
  onSuccess?: () => void;
};

type PendingImage = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

export function AddProductSheet({
  organizationId,
  defaultCategoryId,
  onSuccess,
}: AddProductSheetProps) {
  const [open, setOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);

  const createProduct = useMutation(api.products.create);
  const generateMatrix = useMutation(api.productVariants.generateMatrix);
  const categories = useQuery(api.productCategories.list, {
    organizationId,
  }) as
    | {
        _id: Id<"productCategories">;
        name: string;
        status: "active" | "inactive";
      }[]
    | undefined;

  const activeCategories =
    categories?.filter((c) => c.status === "active") ?? [];

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      sku: "",
      categoryId: (defaultCategoryId ?? "") as string,
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
        const stock = Number.parseInt(value.stockQuantity, 10) || 0;
        const threshold = value.lowStockThreshold
          ? Number.parseInt(value.lowStockThreshold, 10)
          : undefined;

        const hasSupplier =
          value.supplierName ||
          value.supplierPhone ||
          value.supplierEmail ||
          value.supplierNotes;

        const supplierInfo = hasSupplier
          ? {
              name: value.supplierName.trim() || undefined,
              phone: value.supplierPhone.trim() || undefined,
              email: value.supplierEmail.trim() || undefined,
              notes: value.supplierNotes.trim() || undefined,
            }
          : undefined;

        const categoryId =
          value.categoryId && value.categoryId !== "none"
            ? (value.categoryId as Id<"productCategories">)
            : undefined;

        const validVariantOptions =
          variantOptions.length > 0 &&
          variantOptions.every((o) => o.name.trim() && o.values.length > 0);

        const productId = await createProduct({
          organizationId,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          categoryId,
          sku: value.sku.trim() || undefined,
          brand: value.brand.trim() || undefined,
          costPrice: costKurus,
          sellingPrice: sellKurus,
          stockQuantity: hasVariants ? 0 : stock,
          lowStockThreshold: threshold,
          imageStorageIds:
            pendingImages.length > 0
              ? pendingImages.map((img) => img.storageId)
              : undefined,
          supplierInfo,
        });

        if (hasVariants && validVariantOptions) {
          const count = await generateMatrix({
            organizationId,
            productId,
            options: variantOptions,
            defaultCostPrice: costKurus,
            defaultSellingPrice: sellKurus,
          });
          toast.success(
            `Product created with ${count} variant${count !== 1 ? "s" : ""}`,
          );
        } else {
          toast.success("Product created");
        }

        handleClose();
        onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create product",
        );
      }
    },
  });

  const handleClose = () => {
    setPendingImages([]);
    setSupplierOpen(false);
    setHasVariants(false);
    setVariantOptions([]);
    setOpen(false);
    form.reset();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Add Product
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
            <SheetTitle>Add Product</SheetTitle>
            <SheetDescription>
              Create a new product for your salon
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
            {/* Images */}
            <ProductMultiImageUpload
              organizationId={organizationId}
              currentImageUrls={[]}
              currentStorageIds={[]}
              pendingImages={pendingImages}
              onImagesChange={setPendingImages}
            />

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

            {/* Brand + SKU */}
            <div className="grid grid-cols-2 gap-4">
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

              <form.Field name="sku">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>SKU</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. KER-SH-001"
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            {/* Category */}
            <form.Field name="categoryId">
              {(field) => (
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <div className="flex gap-2">
                    <Select
                      value={field.state.value || "none"}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger className="flex-1">
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
                    <AddProductCategoryPopover
                      organizationId={organizationId}
                      onCreated={(id) => form.setFieldValue("categoryId", id)}
                    />
                  </div>
                </Field>
              )}
            </form.Field>

            {/* Pricing */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Pricing & Stock
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="costPrice">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Cost Price (TL)
                      </FieldLabel>
                      <Input
                        id={field.name}
                        type="number"
                        min="0"
                        step="0.01"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0.00"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field
                  name="sellingPrice"
                  validators={{
                    onBlur: ({ value }) => {
                      if (!value) return "Selling price is required";
                      const parsed = Number.parseFloat(value);
                      if (Number.isNaN(parsed) || parsed < 0)
                        return "Must be a valid non-negative number";
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor={field.name}>
                        Selling Price (TL) *
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

              {/* Variants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Product Variants</Label>
                    <p className="text-xs text-muted-foreground">
                      Add size, color, or other options
                    </p>
                  </div>
                  <Switch
                    checked={hasVariants}
                    onCheckedChange={setHasVariants}
                  />
                </div>
                {hasVariants && (
                  <VariantOptionsEditor
                    options={variantOptions}
                    onChange={setVariantOptions}
                  />
                )}
              </div>

              {/* Stock */}
              <div
                className={`grid gap-4 ${!hasVariants ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {!hasVariants && (
                  <form.Field
                    name="stockQuantity"
                    validators={{
                      onBlur: ({ value }) => {
                        const parsed = Number.parseInt(value, 10);
                        if (Number.isNaN(parsed) || parsed < 0)
                          return "Stock must be non-negative";
                        return undefined;
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
                )}

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
            </div>

            {/* Supplier (collapsible) */}
            <div className="pt-2">
              <Collapsible open={supplierOpen} onOpenChange={setSupplierOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight
                      className={`size-4 transition-transform ${supplierOpen ? "rotate-90" : ""}`}
                    />
                    <Separator className="flex-1" />
                    <span className="whitespace-nowrap text-xs font-medium">
                      Supplier Details (optional)
                    </span>
                    <Separator className="flex-1" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="supplierName">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Supplier Name
                          </FieldLabel>
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
                        <FieldLabel htmlFor={field.name}>
                          Supplier Email
                        </FieldLabel>
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
                        <FieldLabel htmlFor={field.name}>Notes</FieldLabel>
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
                </CollapsibleContent>
              </Collapsible>
            </div>
                </FieldGroup>
              </div>
            </ScrollArea>

            <Separator className="shrink-0" />
            <div className="flex items-center justify-end gap-2 px-6 py-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.state.isSubmitting}
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
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
