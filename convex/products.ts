import { ConvexError, v } from "convex/values";
import { getAll } from "convex-helpers/server/relationships";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  ErrorCode,
  ownerMutation,
  ownerQuery,
  publicQuery,
} from "./lib/functions";
import { assertBelongsToOrg } from "./lib/helpers";
import { rateLimiter } from "./lib/rateLimits";
import {
  inventoryTransactionTypeValidator,
  productDetailValidator,
  productPublicValidator,
  productWithCategoryValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all products for an organization, enriched with category name,
 * low-stock flag, and margin percentage.
 * Owner-only.
 */
export const list = ownerQuery({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    categoryId: v.optional(v.id("productCategories")),
  },
  returns: v.array(productWithCategoryValidator),
  handler: async (ctx, args) => {
    // Always query by org index so Convex subscription tracking works correctly.
    // Filtering in JS ensures the subscription re-fires on any product mutation.
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();

    const products = allProducts.filter(
      (p) =>
        (args.categoryId === undefined || p.categoryId === args.categoryId) &&
        (args.status === undefined || p.status === args.status),
    );

    // Batch fetch categories (single round-trip via getAll)
    const uniqueCategoryIds = [
      ...new Set(
        products
          .map((p) => p.categoryId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];
    const categoryMap = new Map<string, string>();

    if (uniqueCategoryIds.length > 0) {
      const catDocs = await getAll(ctx.db, uniqueCategoryIds);
      for (const cat of catDocs) {
        if (cat) categoryMap.set(cat._id, cat.name);
      }
    }

    // Pre-fetch variant data for products with variants
    const variantProducts = products.filter((p) => p.hasVariants);
    const variantMap = new Map<
      string,
      {
        minPrice: number;
        maxPrice: number;
        count: number;
        totalStock: number;
        firstOptionName?: string;
        firstOptionValues?: string[];
      }
    >();

    for (const vp of variantProducts) {
      const variants = await ctx.db
        .query("productVariants")
        .withIndex("by_product", (q) => q.eq("productId", vp._id))
        .collect();

      if (variants.length > 0) {
        const activeVariants = variants.filter((av) => av.status === "active");
        const prices = activeVariants.map((av) => av.sellingPrice);

        // Fetch first option (lowest sortOrder) for card chips
        const firstOption = await ctx.db
          .query("productVariantOptions")
          .withIndex("by_product", (q) => q.eq("productId", vp._id))
          .first();

        variantMap.set(vp._id, {
          minPrice: prices.length > 0 ? Math.min(...prices) : 0,
          maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
          count: variants.length,
          totalStock: variants.reduce((sum, av) => sum + av.stockQuantity, 0),
          firstOptionName: firstOption?.name,
          firstOptionValues: firstOption?.values,
        });
      }
    }

    return products
      .map((product) => {
        const variantInfo = variantMap.get(product._id);
        return {
          ...product,
          categoryName: product.categoryId
            ? categoryMap.get(product.categoryId)
            : undefined,
          isLowStock:
            product.lowStockThreshold !== undefined &&
            product.stockQuantity <= product.lowStockThreshold,
          margin:
            product.sellingPrice > 0
              ? Math.round(
                  ((product.sellingPrice - product.costPrice) /
                    product.sellingPrice) *
                    100,
                )
              : undefined,
          minPrice: variantInfo?.minPrice,
          maxPrice: variantInfo?.maxPrice,
          variantCount: variantInfo?.count,
          totalVariantStock: variantInfo?.totalStock,
          firstOptionName: variantInfo?.firstOptionName,
          firstOptionValues: variantInfo?.firstOptionValues,
        };
      })
      .sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
  },
});

/**
 * Get a single product by ID.
 */
export const get = ownerQuery({
  args: {
    productId: v.id("products"),
  },
  returns: productWithCategoryValidator,
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    let categoryName: string | undefined;
    if (product.categoryId) {
      const cat = await ctx.db.get(product.categoryId);
      categoryName = cat?.name;
    }

    return {
      ...product,
      categoryName,
      isLowStock:
        product.lowStockThreshold !== undefined &&
        product.stockQuantity <= product.lowStockThreshold,
      margin:
        product.sellingPrice > 0
          ? Math.round(
              ((product.sellingPrice - product.costPrice) /
                product.sellingPrice) *
                100,
            )
          : undefined,
    };
  },
});

/**
 * Get detailed product info including category, margin, and recent transactions.
 * Used by the product detail sheet.
 */
export const getDetail = ownerQuery({
  args: {
    productId: v.id("products"),
  },
  returns: productDetailValidator,
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    let categoryName: string | undefined;
    if (product.categoryId) {
      const cat = await ctx.db.get(product.categoryId);
      categoryName = cat?.name;
    }

    // Fetch recent 5 inventory transactions
    const transactions = await ctx.db
      .query("inventoryTransactions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(5);

    // Enrich with staff names (batch via getAll)
    const staffIds = [
      ...new Set(transactions.map((t) => t.staffId).filter(Boolean)),
    ] as Id<"staff">[];
    const staffDocs = await getAll(ctx.db, staffIds);
    const staffMap = new Map<string, string>();
    for (const staff of staffDocs) {
      if (staff) staffMap.set(staff._id, staff.name);
    }

    const recentTransactions = transactions.map((t) => ({
      ...t,
      staffName: t.staffId ? staffMap.get(t.staffId) : undefined,
    }));

    // Fetch variant data if product has variants
    let variants: Doc<"productVariants">[] | undefined;
    let variantOptions: Doc<"productVariantOptions">[] | undefined;

    if (product.hasVariants) {
      variants = await ctx.db
        .query("productVariants")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect();

      variantOptions = await ctx.db
        .query("productVariantOptions")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect();
    }

    return {
      ...product,
      categoryName,
      isLowStock:
        product.lowStockThreshold !== undefined &&
        product.stockQuantity <= product.lowStockThreshold,
      margin:
        product.sellingPrice > 0
          ? Math.round(
              ((product.sellingPrice - product.costPrice) /
                product.sellingPrice) *
                100,
            )
          : undefined,
      recentTransactions,
      variants,
      variantOptions,
    };
  },
});

/**
 * Public catalog: list active products for a given org.
 * Excludes sensitive fields (costPrice, margin, supplierInfo, etc.).
 * No authentication required — used on the customer-facing catalog page.
 */
export const listPublic = publicQuery({
  args: { organizationId: v.id("organization") },
  returns: v.array(productPublicValidator),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    // Batch fetch category names (single round-trip via getAll)
    const uniqueCategoryIds = [
      ...new Set(
        products
          .map((p) => p.categoryId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];
    const categoryMap = new Map<string, string>();
    if (uniqueCategoryIds.length > 0) {
      const catDocs = await getAll(ctx.db, uniqueCategoryIds);
      for (const cat of catDocs) {
        if (cat) categoryMap.set(cat._id, cat.name);
      }
    }

    return products
      .map((product) => ({
        _id: product._id,
        _creationTime: product._creationTime,
        organizationId: product.organizationId,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        categoryName: product.categoryId
          ? categoryMap.get(product.categoryId)
          : undefined,
        brand: product.brand,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        inStock: product.stockQuantity > 0,
        imageUrls: product.imageUrls,
        status: product.status,
        sortOrder: product.sortOrder,
      }))
      .sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new product.
 */
export const create = ownerMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    sku: v.optional(v.string()),
    brand: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    supplierInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
    stockQuantity: v.number(),
    lowStockThreshold: v.optional(v.number()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Validate category belongs to this org
    if (args.categoryId) {
      const cat = await ctx.db.get(args.categoryId);
      assertBelongsToOrg(cat, ctx.organizationId, "Category");
    }

    // Validate SKU uniqueness within org
    if (args.sku) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
        .collect();
      if (existing.some((p) => p.sku === args.sku)) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "A product with this SKU already exists",
        });
      }
    }

    if (args.costPrice < 0 || args.sellingPrice < 0) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Prices must be non-negative",
      });
    }

    if (args.stockQuantity < 0) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Stock quantity must be non-negative",
      });
    }

    if (args.lowStockThreshold !== undefined && args.lowStockThreshold < 0) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Low stock threshold must be non-negative",
      });
    }

    // Validate and resolve image URLs if storageIds provided
    let imageStorageIds: typeof args.imageStorageIds;
    let imageUrls: string[] | undefined;
    if (args.imageStorageIds && args.imageStorageIds.length > 0) {
      if (args.imageStorageIds.length > 4) {
        throw new ConvexError({
          code: ErrorCode.INVALID_INPUT,
          message: "Maximum 4 images allowed per product",
        });
      }
      imageStorageIds = args.imageStorageIds;
      const urls = await Promise.all(
        args.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
      );
      imageUrls = urls.filter((u): u is string => u !== null);
    }

    // Compute next sortOrder
    const existingProducts = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
    const maxSortOrder = existingProducts.reduce(
      (max, p) => Math.max(max, p.sortOrder ?? 0),
      0,
    );

    const productId = await ctx.db.insert("products", {
      organizationId: ctx.organizationId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      sku: args.sku,
      brand: args.brand,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      supplierInfo: args.supplierInfo,
      stockQuantity: args.stockQuantity,
      lowStockThreshold: args.lowStockThreshold,
      imageStorageIds,
      imageUrls,
      sortOrder: maxSortOrder + 1,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log initial stock as a restock transaction if > 0
    if (args.stockQuantity > 0) {
      await ctx.db.insert("inventoryTransactions", {
        organizationId: ctx.organizationId,
        productId,
        staffId: ctx.staff?._id,
        type: "restock",
        quantity: args.stockQuantity,
        previousStock: 0,
        newStock: args.stockQuantity,
        note: "Initial stock",
        createdAt: Date.now(),
      });
    }

    return productId;
  },
});

/**
 * Update a product's details (not stock — use adjustStock for that).
 */
export const update = ownerMutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    sku: v.optional(v.string()),
    brand: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    supplierInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
    lowStockThreshold: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    // Validate category
    if (args.categoryId !== undefined && args.categoryId !== null) {
      const cat = await ctx.db.get(args.categoryId);
      assertBelongsToOrg(cat, ctx.organizationId, "Category");
    }

    // SKU uniqueness check
    if (args.sku !== undefined && args.sku !== product.sku) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
        .collect();
      if (
        existing.some((p) => p._id !== args.productId && p.sku === args.sku)
      ) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "A product with this SKU already exists",
        });
      }
    }

    if (
      (args.costPrice !== undefined && args.costPrice < 0) ||
      (args.sellingPrice !== undefined && args.sellingPrice < 0)
    ) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Prices must be non-negative",
      });
    }

    if (args.lowStockThreshold !== undefined && args.lowStockThreshold < 0) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Low stock threshold must be non-negative",
      });
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.sku !== undefined) updates.sku = args.sku;
    if (args.brand !== undefined) updates.brand = args.brand;
    if (args.costPrice !== undefined) updates.costPrice = args.costPrice;
    if (args.sellingPrice !== undefined)
      updates.sellingPrice = args.sellingPrice;
    if (args.supplierInfo !== undefined)
      updates.supplierInfo = args.supplierInfo;
    if (args.lowStockThreshold !== undefined)
      updates.lowStockThreshold = args.lowStockThreshold;
    if (args.status !== undefined) updates.status = args.status;

    // Handle image updates
    if (args.imageStorageIds !== undefined) {
      if (args.imageStorageIds.length > 4) {
        throw new ConvexError({
          code: ErrorCode.INVALID_INPUT,
          message: "Maximum 4 images allowed per product",
        });
      }
      updates.imageStorageIds = args.imageStorageIds;
      if (args.imageStorageIds.length > 0) {
        const urls = await Promise.all(
          args.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
        );
        updates.imageUrls = urls.filter((u): u is string => u !== null);
      } else {
        updates.imageUrls = [];
      }
    }

    // Log price changes to price history
    const now = Date.now();
    if (args.costPrice !== undefined && args.costPrice !== product.costPrice) {
      await ctx.db.insert("priceHistory", {
        organizationId: ctx.organizationId,
        productId: args.productId,
        field: "costPrice",
        previousValue: product.costPrice,
        newValue: args.costPrice,
        changedBy: ctx.staff?._id,
        createdAt: now,
      });
    }
    if (
      args.sellingPrice !== undefined &&
      args.sellingPrice !== product.sellingPrice
    ) {
      await ctx.db.insert("priceHistory", {
        organizationId: ctx.organizationId,
        productId: args.productId,
        field: "sellingPrice",
        previousValue: product.sellingPrice,
        newValue: args.sellingPrice,
        changedBy: ctx.staff?._id,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.productId, updates);
    return true;
  },
});

/**
 * Adjust stock for a product (restock, manual adjustment, or waste).
 * Always logs an inventory transaction.
 */
export const adjustStock = ownerMutation({
  args: {
    productId: v.id("products"),
    type: inventoryTransactionTypeValidator,
    quantity: v.number(), // signed: positive = add, negative = remove
    note: v.optional(v.string()),
  },
  returns: v.number(), // new stock quantity
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    if (args.quantity === 0) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Quantity cannot be zero",
      });
    }

    const previousStock = product.stockQuantity;
    const newStock = previousStock + args.quantity;

    if (newStock < 0) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: `Cannot reduce stock below zero. Current stock: ${previousStock}`,
      });
    }

    await ctx.db.patch(args.productId, {
      stockQuantity: newStock,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("inventoryTransactions", {
      organizationId: ctx.organizationId,
      productId: args.productId,
      staffId: ctx.staff?._id,
      type: args.type,
      quantity: args.quantity,
      previousStock,
      newStock,
      note: args.note,
      createdAt: Date.now(),
    });

    // Fire low-stock notification if stock dropped below threshold
    const threshold = product.lowStockThreshold;
    if (
      threshold !== undefined &&
      newStock <= threshold &&
      previousStock > threshold
    ) {
      await ctx.scheduler.runAfter(0, internal.notifications.notifyAllStaff, {
        organizationId: ctx.organizationId,
        type: "low_stock" as const,
        title: "Low Stock Alert",
        message: `${product.name} is running low on stock (${newStock} remaining)`,
      });
    }

    return newStock;
  },
});

/**
 * Soft-delete a product by setting status to inactive.
 */
export const deactivate = ownerMutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    await ctx.db.patch(args.productId, {
      status: "inactive",
      updatedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Permanently delete a product and all related records.
 * Removes: inventoryTransactions, priceHistory, productVariants,
 * productVariantOptions, storage files, and the product itself.
 */
export const remove = ownerMutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    // 1. Delete all inventory transactions
    const transactions = await ctx.db
      .query("inventoryTransactions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    // 2. Delete all price history
    const priceHistoryRecords = await ctx.db
      .query("priceHistory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const ph of priceHistoryRecords) {
      await ctx.db.delete(ph._id);
    }

    // 3. Delete all product variants
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }

    // 4. Delete all product variant options
    const variantOptions = await ctx.db
      .query("productVariantOptions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const opt of variantOptions) {
      await ctx.db.delete(opt._id);
    }

    // 5. Delete storage files
    if (product.imageStorageIds && product.imageStorageIds.length > 0) {
      for (const storageId of product.imageStorageIds) {
        await ctx.storage.delete(storageId);
      }
    }

    // 6. Delete the product
    await ctx.db.delete(args.productId);

    return null;
  },
});

// =============================================================================
// Reorder & Duplicate
// =============================================================================

/**
 * Reorder products by assigning sortOrder based on array index.
 */
export const reorder = ownerMutation({
  args: {
    productIds: v.array(v.id("products")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const updates = args.productIds.map(async (id, index) => {
      const product = await ctx.db.get(id);
      assertBelongsToOrg(product, ctx.organizationId, "Product");
      await ctx.db.patch(id, { sortOrder: index + 1 });
    });

    await Promise.all(updates);
    return true;
  },
});

/**
 * Duplicate a product. Copies all details except SKU (must be unique)
 * and resets stock to 0.
 */
export const duplicate = ownerMutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "duplicateProduct", {
      key: ctx.organizationId,
    });

    const product = await ctx.db.get(args.productId);
    assertBelongsToOrg(product, ctx.organizationId, "Product");

    // Compute next sortOrder
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
    const maxSortOrder = allProducts.reduce(
      (max, p) => Math.max(max, p.sortOrder ?? 0),
      0,
    );

    const now = Date.now();
    const newProductId = await ctx.db.insert("products", {
      organizationId: ctx.organizationId,
      categoryId: product.categoryId,
      name: `${product.name} (Copy)`,
      description: product.description,
      brand: product.brand,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      supplierInfo: product.supplierInfo,
      stockQuantity: 0,
      lowStockThreshold: product.lowStockThreshold,
      imageStorageIds: product.imageStorageIds,
      imageUrls: product.imageUrls,
      sortOrder: maxSortOrder + 1,
      hasVariants: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return newProductId;
  },
});
