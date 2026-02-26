import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerMutation, ownerQuery } from "./lib/functions";
import {
  inventoryTransactionTypeValidator,
  productVariantOptionDocValidator,
  variantWithLabelValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all variant options for a product.
 */
export const listOptions = ownerQuery({
  args: {
    productId: v.id("products"),
  },
  returns: v.array(productVariantOptionDocValidator),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    return ctx.db
      .query("productVariantOptions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

/**
 * List all variants for a product, enriched with a label.
 */
export const listByProduct = ownerQuery({
  args: {
    productId: v.id("products"),
  },
  returns: v.array(variantWithLabelValidator),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return variants.map((variant) => ({
      ...variant,
      label: variant.optionValues
        .map((ov) => `${ov.optionName}: ${ov.value}`)
        .join(" / "),
      margin:
        variant.sellingPrice > 0
          ? Math.round(
              ((variant.sellingPrice - variant.costPrice) /
                variant.sellingPrice) *
                100,
            )
          : undefined,
    }));
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Save variant options and generate the variant matrix for a product.
 * Deletes existing options/variants and recreates from scratch.
 */
export const generateMatrix = ownerMutation({
  args: {
    productId: v.id("products"),
    options: v.array(
      v.object({
        name: v.string(),
        values: v.array(v.string()),
      }),
    ),
    defaultCostPrice: v.number(),
    defaultSellingPrice: v.number(),
  },
  returns: v.number(), // count of generated variants
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    if (args.options.length === 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "At least one option is required",
      });
    }

    // Validate: max 3 options, max 10 values per option
    if (args.options.length > 3) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Maximum 3 variant options allowed",
      });
    }
    for (const opt of args.options) {
      if (opt.values.length === 0 || opt.values.length > 10) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Option "${opt.name}" must have 1-10 values`,
        });
      }
    }

    // Reject duplicate option names
    const optionNames = args.options.map((o) => o.name);
    if (new Set(optionNames).size !== optionNames.length) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Duplicate option names are not allowed",
      });
    }

    // Cap total combinations
    const totalCombinations = args.options.reduce(
      (acc, opt) => acc * opt.values.length,
      1,
    );
    if (totalCombinations > 100) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Too many combinations (${totalCombinations}). Maximum is 100.`,
      });
    }

    // Delete existing options
    const existingOptions = await ctx.db
      .query("productVariantOptions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const opt of existingOptions) {
      await ctx.db.delete(opt._id);
    }

    // Delete existing variants
    const existingVariants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const v of existingVariants) {
      await ctx.db.delete(v._id);
    }

    // Insert new options
    for (let i = 0; i < args.options.length; i++) {
      await ctx.db.insert("productVariantOptions", {
        organizationId: ctx.organizationId,
        productId: args.productId,
        name: args.options[i].name,
        values: args.options[i].values,
        sortOrder: i + 1,
      });
    }

    // Generate cartesian product of option values
    const combinations = cartesianProduct(
      args.options.map((opt) =>
        opt.values.map((val) => ({ optionName: opt.name, value: val })),
      ),
    );

    // Insert variants
    for (const combo of combinations) {
      await ctx.db.insert("productVariants", {
        organizationId: ctx.organizationId,
        productId: args.productId,
        optionValues: combo,
        costPrice: args.defaultCostPrice,
        sellingPrice: args.defaultSellingPrice,
        stockQuantity: 0,
        status: "active",
      });
    }

    // Mark product as having variants
    await ctx.db.patch(args.productId, {
      hasVariants: true,
      updatedAt: Date.now(),
    });

    return combinations.length;
  },
});

/**
 * Update a single variant's pricing, SKU, or status.
 */
export const update = ownerMutation({
  args: {
    variantId: v.id("productVariants"),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    sku: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant || variant.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Variant not found",
      });
    }

    const patch: Record<string, unknown> = {};
    if (args.costPrice !== undefined) patch.costPrice = args.costPrice;
    if (args.sellingPrice !== undefined) patch.sellingPrice = args.sellingPrice;
    if (args.sku !== undefined) patch.sku = args.sku;
    if (args.status !== undefined) patch.status = args.status;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.variantId, patch);
    }

    return null;
  },
});

/**
 * Adjust stock for a single variant. Creates inventory transaction.
 */
export const adjustStock = ownerMutation({
  args: {
    variantId: v.id("productVariants"),
    type: inventoryTransactionTypeValidator,
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.number(), // new stock
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant || variant.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Variant not found",
      });
    }

    if (!Number.isInteger(args.quantity)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Quantity must be a whole number",
      });
    }

    if (args.quantity === 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Quantity cannot be zero",
      });
    }

    const newStock = variant.stockQuantity + args.quantity;
    if (newStock < 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Stock cannot go below zero",
      });
    }

    // Update variant stock
    await ctx.db.patch(args.variantId, { stockQuantity: newStock });

    // Create inventory transaction
    await ctx.db.insert("inventoryTransactions", {
      organizationId: ctx.organizationId,
      productId: variant.productId,
      variantId: args.variantId,
      staffId: ctx.staff?._id,
      type: args.type,
      quantity: args.quantity,
      previousStock: variant.stockQuantity,
      newStock,
      note: args.note,
      createdAt: Date.now(),
    });

    // Update parent product's total stock
    await syncParentStock(ctx, variant.productId);

    return newStock;
  },
});

/**
 * Remove all variants and options from a product (revert to simple product).
 */
export const removeAll = ownerMutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    // Check if any variant has stock > 0
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const hasStock = variants.some((v) => v.stockQuantity > 0);
    if (hasStock) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Cannot remove all variants — some still have stock. Adjust stock to 0 first.",
      });
    }

    // Delete variants
    for (const v of variants) {
      await ctx.db.delete(v._id);
    }

    // Delete options
    const options = await ctx.db
      .query("productVariantOptions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const o of options) {
      await ctx.db.delete(o._id);
    }

    await ctx.db.patch(args.productId, {
      hasVariants: false,
      stockQuantity: 0,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update the variant matrix while preserving existing variant data.
 * Matches existing variants by canonical key (optionName:value pairs).
 * New combinations get default prices; removed ones must have stock=0.
 */
export const updateMatrix = ownerMutation({
  args: {
    productId: v.id("products"),
    options: v.array(
      v.object({
        name: v.string(),
        values: v.array(v.string()),
      }),
    ),
    defaultCostPrice: v.number(),
    defaultSellingPrice: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    if (args.options.length === 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "At least one option is required",
      });
    }

    if (args.options.length > 3) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Maximum 3 variant options allowed",
      });
    }

    // Validate each option
    for (const opt of args.options) {
      if (opt.values.length === 0 || opt.values.length > 10) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Option "${opt.name}" must have 1-10 values`,
        });
      }
    }

    // Check total combinations limit
    const totalCombinations = args.options.reduce(
      (acc, opt) => acc * opt.values.length,
      1,
    );
    if (totalCombinations > 100) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Too many combinations (${totalCombinations}). Maximum is 100.`,
      });
    }

    // Check duplicate option names
    const optionNames = args.options.map((o) => o.name);
    if (new Set(optionNames).size !== optionNames.length) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Duplicate option names are not allowed",
      });
    }

    // Fetch existing variants and build canonical key map
    const existingVariants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const existingMap = new Map<string, (typeof existingVariants)[0]>();
    for (const ev of existingVariants) {
      const key = ev.optionValues
        .map((ov) => `${ov.optionName}:${ov.value}`)
        .sort()
        .join("|");
      existingMap.set(key, ev);
    }

    // Generate new cartesian product
    const newCombinations = cartesianProduct(
      args.options.map((opt) =>
        opt.values.map((val) => ({ optionName: opt.name, value: val })),
      ),
    );

    const newKeys = new Set<string>();
    for (const combo of newCombinations) {
      const key = combo
        .map((ov) => `${ov.optionName}:${ov.value}`)
        .sort()
        .join("|");
      newKeys.add(key);
    }

    // Check: variants that would be removed must have stock=0
    for (const [key, ev] of existingMap) {
      if (!newKeys.has(key) && ev.stockQuantity > 0) {
        const label = ev.optionValues
          .map((ov) => `${ov.optionName}: ${ov.value}`)
          .join(" / ");
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Cannot remove variant "${label}" — it has ${ev.stockQuantity} units in stock`,
        });
      }
    }

    // Delete variants that no longer exist
    for (const [key, ev] of existingMap) {
      if (!newKeys.has(key)) {
        await ctx.db.delete(ev._id);
      }
    }

    // Create new variants (or keep existing)
    let newVariantCount = 0;
    for (const combo of newCombinations) {
      const key = combo
        .map((ov) => `${ov.optionName}:${ov.value}`)
        .sort()
        .join("|");
      if (!existingMap.has(key)) {
        await ctx.db.insert("productVariants", {
          organizationId: ctx.organizationId,
          productId: args.productId,
          optionValues: combo,
          costPrice: args.defaultCostPrice,
          sellingPrice: args.defaultSellingPrice,
          stockQuantity: 0,
          status: "active",
        });
        newVariantCount++;
      }
    }

    // Update option documents: delete old, insert new
    const existingOptions = await ctx.db
      .query("productVariantOptions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    for (const opt of existingOptions) {
      await ctx.db.delete(opt._id);
    }
    for (let i = 0; i < args.options.length; i++) {
      await ctx.db.insert("productVariantOptions", {
        organizationId: ctx.organizationId,
        productId: args.productId,
        name: args.options[i].name,
        values: args.options[i].values,
        sortOrder: i + 1,
      });
    }

    // Mark product as having variants and sync stock
    await ctx.db.patch(args.productId, {
      hasVariants: true,
      updatedAt: Date.now(),
    });
    await syncParentStock(ctx, args.productId);

    return newVariantCount;
  },
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate cartesian product of arrays.
 * e.g. [[{Size: S}, {Size: M}], [{Color: Red}, {Color: Blue}]]
 * → [[{Size: S, Color: Red}], [{Size: S, Color: Blue}], ...]
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((combo) => curr.map((item) => [...combo, item])),
    [[]],
  );
}

/**
 * Sync parent product's stockQuantity from variant totals.
 */
async function syncParentStock(ctx: { db: any }, productId: any) {
  const variants = await ctx.db
    .query("productVariants")
    .withIndex("by_product", (q: any) => q.eq("productId", productId))
    .collect();

  const totalStock = variants.reduce(
    (sum: number, v: any) => sum + v.stockQuantity,
    0,
  );

  await ctx.db.patch(productId, {
    stockQuantity: totalStock,
    updatedAt: Date.now(),
  });
}
