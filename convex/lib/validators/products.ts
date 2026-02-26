import { v } from "convex/values";
import { literals, typedV, withSystemFields } from "convex-helpers/validators";
import schema from "../../schema";

const vv = typedV(schema);

// =============================================================================
// Product & Inventory Validators (M11)
// =============================================================================

/** Product category status: active | inactive */
export const productCategoryStatusValidator = literals("active", "inactive");

/** Product status: active | inactive */
export const productStatusValidator = literals("active", "inactive");

/** Inventory transaction type: restock | adjustment | waste */
export const inventoryTransactionTypeValidator = literals(
  "restock",
  "adjustment",
  "waste",
);

/** Product category document validator */
export const productCategoryDocValidator = vv.doc("productCategories");

/** Product document validator */
export const productDocValidator = vv.doc("products");

/** Inventory transaction document validator */
export const inventoryTransactionDocValidator = vv.doc("inventoryTransactions");

/** Price history document validator */
export const priceHistoryDocValidator = vv.doc("priceHistory");

/** Product variant option document validator */
export const productVariantOptionDocValidator = vv.doc("productVariantOptions");

/** Product variant document validator */
export const productVariantDocValidator = vv.doc("productVariants");

/** Product benefits document validator */
export const productBenefitsDocValidator = vv.doc("productBenefits");

/** Product category with product count */
export const productCategoryWithCountValidator = v.object(
  withSystemFields("productCategories", {
    ...schema.tables.productCategories.validator.fields,
    productCount: v.number(),
  }),
);

/** Product with category name (enriched query result) */
export const productWithCategoryValidator = v.object(
  withSystemFields("products", {
    ...schema.tables.products.validator.fields,
    categoryName: v.optional(v.string()),
    isLowStock: v.boolean(),
    margin: v.optional(v.number()), // percentage, omitted if sellingPrice is 0
    // Variant price range (only for hasVariants products)
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    variantCount: v.optional(v.number()),
    totalVariantStock: v.optional(v.number()),
    // First option preview (for card chips)
    firstOptionName: v.optional(v.string()),
    firstOptionValues: v.optional(v.array(v.string())),
  }),
);

/** Inventory transaction with product name and staff name */
export const inventoryTransactionWithDetailsValidator = v.object(
  withSystemFields("inventoryTransactions", {
    ...schema.tables.inventoryTransactions.validator.fields,
    productName: v.string(),
    staffName: v.optional(v.string()),
  }),
);

/**
 * Public-safe product data exposed on the customer-facing catalog page.
 * Excludes sensitive internal fields: costPrice, margin, supplierInfo,
 * lowStockThreshold, and exact stockQuantity.
 */
export const productPublicValidator = v.object({
  _id: vv.id("products"),
  _creationTime: v.number(),
  organizationId: vv.id("organization"),
  name: v.string(),
  description: v.optional(v.string()),
  categoryId: v.optional(vv.id("productCategories")),
  categoryName: v.optional(v.string()),
  brand: v.optional(v.string()),
  sku: v.optional(v.string()),
  sellingPrice: v.number(),
  inStock: v.boolean(),
  imageUrls: v.optional(v.array(v.string())),
  status: literals("active", "inactive"),
});

/** Inventory stats for dashboard overview */
export const inventoryStatsValidator = v.object({
  totalProducts: v.number(),
  totalStockValue: v.number(),
  lowStockCount: v.number(),
  outOfStockCount: v.number(),
});

/** Product detail with category, margin, and recent transactions */
export const productDetailValidator = v.object(
  withSystemFields("products", {
    ...schema.tables.products.validator.fields,
    categoryName: v.optional(v.string()),
    isLowStock: v.boolean(),
    margin: v.optional(v.number()),
    recentTransactions: v.array(
      v.object(
        withSystemFields("inventoryTransactions", {
          ...schema.tables.inventoryTransactions.validator.fields,
          staffName: v.optional(v.string()),
        }),
      ),
    ),
    variants: v.optional(
      v.array(
        v.object(
          withSystemFields("productVariants", {
            ...schema.tables.productVariants.validator.fields,
          }),
        ),
      ),
    ),
    variantOptions: v.optional(
      v.array(
        v.object(
          withSystemFields("productVariantOptions", {
            ...schema.tables.productVariantOptions.validator.fields,
          }),
        ),
      ),
    ),
  }),
);

/** Price history entry with staff name */
export const priceHistoryWithStaffValidator = v.object(
  withSystemFields("priceHistory", {
    ...schema.tables.priceHistory.validator.fields,
    staffName: v.optional(v.string()),
  }),
);

/** Product variant status */
export const productVariantStatusValidator = literals("active", "inactive");

/** Option value pair used in variant combinations */
export const optionValueValidator = v.object({
  optionName: v.string(),
  value: v.string(),
});

/** Variant with computed label (e.g. "Size: 100ml / Color: Red") and margin */
export const variantWithLabelValidator = v.object(
  withSystemFields("productVariants", {
    ...schema.tables.productVariants.validator.fields,
    label: v.string(),
    margin: v.optional(v.number()),
  }),
);
