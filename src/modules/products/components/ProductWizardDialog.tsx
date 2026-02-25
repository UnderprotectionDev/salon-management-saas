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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  buildVariantStockMap,
  optionsChanged,
} from "../lib/variant-helpers";
import { AddProductCategoryPopover } from "./AddProductCategoryPopover";
import { ProductMultiImageUpload } from "./ProductMultiImageUpload";
import {
  type VariantOption,
  VariantOptionsEditor,
} from "./VariantOptionsEditor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  hasVariants?: boolean;
  status: "active" | "inactive";
  imageUrls?: string[];
  imageStorageIds?: Id<"_storage">[];
  supplierInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
};

type ProductWizardDialogProps = {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organization">;
  product?: Product | null;
  defaultCategoryId?: Id<"productCategories">;
};

type PendingImage = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

function liraToKurus(lira: string | number): number {
  const parsed = typeof lira === "string" ? Number.parseFloat(lira) : lira;
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function kurusToLira(kurus: number): string {
  return (kurus / 100).toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductWizardDialog({
  mode,
  open,
  onOpenChange,
  organizationId,
  product,
  defaultCategoryId,
}: ProductWizardDialogProps) {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [initialOptions, setInitialOptions] = useState<VariantOption[]>([]);
  const [removeAllConfirmOpen, setRemoveAllConfirmOpen] = useState(false);

  const createProduct = useMutation(api.products.create);
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

  const isEdit = mode === "edit" && product != null;

  // Fetch existing variant data in edit mode
  const existingOptions = useQuery(
    api.productVariants.listOptions,
    isEdit && product?.hasVariants
      ? { organizationId, productId: product._id }
      : "skip",
  );
  const existingVariants = useQuery(
    api.productVariants.listByProduct,
    isEdit && product?.hasVariants
      ? { organizationId, productId: product._id }
      : "skip",
  );

  const variantStockMap =
    existingVariants && isEdit ? buildVariantStockMap(existingVariants) : undefined;

  const totalVariantStock =
    existingVariants?.reduce((sum, v) => sum + v.stockQuantity, 0) ?? 0;

  // Initialize variant state from existing data when dialog opens in edit mode
  useEffect(() => {
    if (isEdit && product?.hasVariants && existingOptions) {
      const opts: VariantOption[] = existingOptions.map((o) => ({
        name: o.name,
        values: [...o.values],
      }));
      setVariantOptions(opts);
      setInitialOptions(opts.map((o) => ({ name: o.name, values: [...o.values] })));
      setHasVariants(true);
    } else if (isEdit && !product?.hasVariants) {
      setHasVariants(false);
      setVariantOptions([]);
      setInitialOptions([]);
    }
  }, [isEdit, product?.hasVariants, existingOptions, product?._id]);

  const form = useForm({
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      brand: product?.brand ?? "",
      sku: product?.sku ?? "",
      status: product?.status ?? ("active" as "active" | "inactive"),
      categoryId: (product?.categoryId ?? defaultCategoryId ?? "") as string,
      costPrice: isEdit ? kurusToLira(product.costPrice) : "",
      sellingPrice: isEdit ? kurusToLira(product.sellingPrice) : "",
      stockQuantity: "0",
      lowStockThreshold: product?.lowStockThreshold?.toString() ?? "",
      supplierName: product?.supplierInfo?.name ?? "",
      supplierPhone: product?.supplierInfo?.phone ?? "",
      supplierEmail: product?.supplierInfo?.email ?? "",
      supplierNotes: product?.supplierInfo?.notes ?? "",
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

        if (isEdit) {
          // Update product details
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

          // Handle variant changes
          const wasVariant = product.hasVariants ?? false;

          if (!wasVariant && hasVariants && validVariantOptions) {
            // Simple → Variant: generate matrix
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
            // Variant → Variant (options changed): updateMatrix
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
        } else {
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

          // Generate variant matrix if enabled
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
        }

        handleClose();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to ${isEdit ? "update" : "create"} product`,
        );
      }
    },
  });

  const handleClose = () => {
    setPendingImages([]);
    setSupplierOpen(false);
    setHasVariants(false);
    setVariantOptions([]);
    setInitialOptions([]);
    onOpenChange(false);
  };

  const handleRemoveAllVariants = async () => {
    if (!isEdit || !product) return;
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
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup className="py-4">
              {/* === Images === */}
              <ProductMultiImageUpload
                productId={isEdit ? product._id : undefined}
                organizationId={organizationId}
                currentImageUrls={isEdit ? (product.imageUrls ?? []) : []}
                currentStorageIds={
                  isEdit ? (product.imageStorageIds ?? []) : []
                }
                pendingImages={pendingImages}
                onImagesChange={setPendingImages}
              />

              {/* === Name === */}
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

              {/* === Description === */}
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

              {/* === Brand + SKU === */}
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

              {/* === Status (edit mode only) === */}
              {isEdit && (
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
              )}

              {/* ─── Pricing & Stock ─────────────────────── */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Pricing & Stock
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Category with inline create */}
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
                          onCreated={(id) =>
                            form.setFieldValue("categoryId", id)
                          }
                        />
                      </div>
                    </Field>
                  )}
                </form.Field>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="costPrice">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Cost Price (₺)
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

                {/* Variants section */}
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
                        if (!checked && isEdit && product?.hasVariants) {
                          // Must use "Remove All Variants" to revert
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
                      {/* Remove All Variants button (edit mode only) */}
                      {isEdit && product?.hasVariants && (
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

                {/* Stock (add mode, non-variant only) + Low stock threshold */}
                <div
                  className={`grid gap-4 ${!isEdit && !hasVariants ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {!isEdit && !hasVariants && (
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
                        <Field
                          data-invalid={field.state.meta.errors.length > 0}
                        >
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

              {/* ─── Supplier (collapsible) ─────────────── */}
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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

            {/* Footer */}
            <DialogFooter className="flex-row gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {isEdit ? "Save Changes" : "Create Product"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
