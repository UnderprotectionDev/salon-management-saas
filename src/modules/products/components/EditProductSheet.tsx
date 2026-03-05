"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { kurusToLiraString, liraToKurus } from "@/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { buildVariantStockMap, optionsChanged } from "../lib/variant-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddProductCategoryPopover } from "./AddProductCategoryPopover";
import type { Product } from "./ProductCard";
import { ProductMultiImageUpload } from "./ProductMultiImageUpload";
import {
  type VariantOption,
  VariantOptionsEditor,
} from "./VariantOptionsEditor";

type EditProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  organizationId: Id<"organization">;
};

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

export function EditProductSheet({
  open,
  onOpenChange,
  product,
  organizationId,
}: EditProductSheetProps) {
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [initialOptions, setInitialOptions] = useState<VariantOption[]>([]);
  const [removeAllConfirmOpen, setRemoveAllConfirmOpen] = useState(false);

  const updateProduct = useMutation(api.products.update);
  const generateMatrix = useMutation(api.productVariants.generateMatrix);
  const updateMatrix = useMutation(api.productVariants.updateMatrix);
  const removeAllVariants = useMutation(api.productVariants.removeAll);
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

  const existingOptions = useQuery(
    api.productVariants.listOptions,
    product?.hasVariants ? { organizationId, productId: product._id } : "skip",
  );
  const existingVariants = useQuery(
    api.productVariants.listByProduct,
    product?.hasVariants ? { organizationId, productId: product._id } : "skip",
  );

  const variantStockMap =
    existingVariants && product
      ? buildVariantStockMap(existingVariants)
      : undefined;

  const totalVariantStock =
    existingVariants?.reduce((sum, v) => sum + v.stockQuantity, 0) ?? 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally depend on product._id and hasVariants only
  useEffect(() => {
    if (product?.hasVariants && existingOptions) {
      const opts: VariantOption[] = existingOptions.map((o) => ({
        name: o.name,
        values: [...o.values],
      }));
      setVariantOptions(opts);
      setInitialOptions(
        opts.map((o) => ({ name: o.name, values: [...o.values] })),
      );
      setHasVariants(true);
    } else if (product && !product.hasVariants) {
      setHasVariants(false);
      setVariantOptions([]);
      setInitialOptions([]);
    }
  }, [product?.hasVariants, existingOptions, product?._id]);

  const form = useForm({
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      brand: product?.brand ?? "",
      sku: product?.sku ?? "",
      status: product?.status ?? ("active" as "active" | "inactive"),
      categoryId: (product?.categoryId ?? "") as string,
      costPrice: product ? kurusToLiraString(product.costPrice) : "",
      sellingPrice: product ? kurusToLiraString(product.sellingPrice) : "",
      lowStockThreshold: product?.lowStockThreshold?.toString() ?? "",
      supplierName: product?.supplierInfo?.name ?? "",
      supplierPhone: product?.supplierInfo?.phone ?? "",
      supplierEmail: product?.supplierInfo?.email ?? "",
      supplierNotes: product?.supplierInfo?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      if (!product) return;
      try {
        const costKurus = liraToKurus(value.costPrice || "0");
        const sellKurus = liraToKurus(value.sellingPrice);
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

        await updateProduct({
          organizationId,
          productId: product._id,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          categoryId,
          sku: value.sku.trim() || undefined,
          brand: value.brand.trim() || undefined,
          costPrice: costKurus,
          sellingPrice: sellKurus,
          lowStockThreshold: threshold,
          status: value.status,
          supplierInfo,
        });

        const wasVariant = product.hasVariants ?? false;

        if (!wasVariant && hasVariants && validVariantOptions) {
          const count = await generateMatrix({
            organizationId,
            productId: product._id,
            options: variantOptions,
            defaultCostPrice: costKurus,
            defaultSellingPrice: sellKurus,
          });
          toast.success(
            `Product updated with ${count} variant${count !== 1 ? "s" : ""}`,
          );
        } else if (
          wasVariant &&
          hasVariants &&
          validVariantOptions &&
          optionsChanged(initialOptions, variantOptions)
        ) {
          const count = await updateMatrix({
            organizationId,
            productId: product._id,
            options: variantOptions,
            defaultCostPrice: costKurus,
            defaultSellingPrice: sellKurus,
          });
          toast.success(
            `Variants updated (${count} variant${count !== 1 ? "s" : ""})`,
          );
        } else {
          toast.success("Product updated");
        }

        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update product",
        );
      }
    },
  });

  const handleRemoveAllVariants = async () => {
    if (!product) return;
    try {
      await removeAllVariants({
        organizationId,
        productId: product._id,
      });
      setHasVariants(false);
      setVariantOptions([]);
      setInitialOptions([]);
      toast.success("All variants removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove variants",
      );
    }
    setRemoveAllConfirmOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
            <SheetTitle>Edit Product</SheetTitle>
            <SheetDescription>Update product details</SheetDescription>
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
              productId={product?._id}
              organizationId={organizationId}
              currentImageUrls={product?.imageUrls ?? []}
              currentStorageIds={product?.imageStorageIds ?? []}
              pendingImages={[]}
              onImagesChange={() => {}}
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

            {/* Status */}
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
                    onCheckedChange={(checked) => {
                      if (!checked && product?.hasVariants) {
                        toast.error(
                          "Use the 'Remove All Variants' button below to remove variant support.",
                        );
                        return;
                      }
                      setHasVariants(checked);
                    }}
                  />
                </div>
                {hasVariants && (
                  <>
                    <VariantOptionsEditor
                      options={variantOptions}
                      onChange={setVariantOptions}
                      variantStockMap={variantStockMap}
                    />
                    {product?.hasVariants && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => setRemoveAllConfirmOpen(true)}
                        disabled={totalVariantStock > 0}
                        title={
                          totalVariantStock > 0
                            ? "All variant stock must be 0 to remove"
                            : undefined
                        }
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Remove All Variants
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Low stock threshold */}
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
                onClick={() => onOpenChange(false)}
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
                    Save Changes
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Remove All Variants Confirmation */}
      <AlertDialog
        open={removeAllConfirmOpen}
        onOpenChange={setRemoveAllConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Variants?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all variant options and combinations. The product
              will revert to a simple (non-variant) product with 0 stock. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAllVariants}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
