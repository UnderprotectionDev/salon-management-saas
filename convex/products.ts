import { ConvexError, v } from "convex/values";
import {
  ErrorCode,
  ownerMutation,
  ownerQuery,
  publicQuery,
} from "./lib/functions";
import {
  inventoryTransactionTypeValidator,
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

    // Batch fetch categories to avoid N+1
    const uniqueCategoryIds = [
      ...new Set(
        products
          .map((p) => p.categoryId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];
    const categoryMap = new Map<string, string>();

    if (uniqueCategoryIds.length > 0) {
      await Promise.all(
        uniqueCategoryIds.map(async (id) => {
          const cat = await ctx.db.get(id);
          if (cat) categoryMap.set(id, cat.name);
        }),
      );
    }

    return products
      .map((product) => ({
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
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
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
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

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
 * Count of low-stock products for the dashboard alert.
 */
export const countLowStock = ownerQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();

    return products.filter(
      (p) =>
        p.lowStockThreshold !== undefined &&
        p.stockQuantity <= p.lowStockThreshold,
    ).length;
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

    // Batch fetch category names
    const uniqueCategoryIds = [
      ...new Set(
        products
          .map((p) => p.categoryId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];
    const categoryMap = new Map<string, string>();
    if (uniqueCategoryIds.length > 0) {
      await Promise.all(
        uniqueCategoryIds.map(async (id) => {
          const cat = await ctx.db.get(id);
          if (cat) categoryMap.set(id, cat.name);
        }),
      );
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
        status: product.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
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
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Validate category belongs to this org
    if (args.categoryId) {
      const cat = await ctx.db.get(args.categoryId);
      if (!cat || cat.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Category not found",
        });
      }
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
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    // Validate category
    if (args.categoryId !== undefined && args.categoryId !== null) {
      const cat = await ctx.db.get(args.categoryId);
      if (!cat || cat.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Category not found",
        });
      }
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
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

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
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    await ctx.db.patch(args.productId, {
      status: "inactive",
      updatedAt: Date.now(),
    });
    return true;
  },
});
