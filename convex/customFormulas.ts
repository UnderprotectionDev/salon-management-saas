import { ConvexError, v } from "convex/values";
import { FORMULA_NAMES } from "../src/modules/financials/lib/formula-catalog";
import { ErrorCode, ownerMutation, ownerQuery } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

const NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

const customFormulaDocValidator = v.object({
  _id: v.id("customFormulas"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  name: v.string(),
  body: v.string(),
  description: v.optional(v.string()),
  createdBy: v.id("user"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** List all custom formulas for the organization */
export const list = ownerQuery({
  args: {},
  returns: v.array(customFormulaDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("customFormulas")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});

/** Create a new custom formula */
export const create = ownerMutation({
  args: {
    name: v.string(),
    body: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("customFormulas"),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createCustomFormula", {
      key: ctx.organizationId,
    });

    const name = args.name.trim().toUpperCase();

    // Validate name format
    if (!NAME_PATTERN.test(name)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Formula name must contain only uppercase letters, digits, and underscores, and start with a letter or underscore",
      });
    }

    // Check reserved names
    if (FORMULA_NAMES.includes(name)) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: `"${name}" is a built-in formula name`,
      });
    }

    // Validate body starts with "="
    if (!args.body.startsWith("=")) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Formula body must start with "="',
      });
    }

    // Check uniqueness within org
    const existing = await ctx.db
      .query("customFormulas")
      .withIndex("by_org_name", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("name", name),
      )
      .first();
    if (existing) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: `A custom formula named "${name}" already exists`,
      });
    }

    const now = Date.now();
    return await ctx.db.insert("customFormulas", {
      organizationId: ctx.organizationId,
      name,
      body: args.body,
      description: args.description,
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update an existing custom formula */
export const update = ownerMutation({
  args: {
    id: v.id("customFormulas"),
    name: v.optional(v.string()),
    body: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const formula = await ctx.db.get(args.id);
    if (!formula) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Custom formula not found",
      });
    }
    if (formula.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Unauthorized",
      });
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const name = args.name.trim().toUpperCase();
      if (!NAME_PATTERN.test(name)) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid formula name format",
        });
      }
      if (FORMULA_NAMES.includes(name)) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: `"${name}" is a built-in formula name`,
        });
      }
      // Check uniqueness (excluding self)
      if (name !== formula.name) {
        const existing = await ctx.db
          .query("customFormulas")
          .withIndex("by_org_name", (q) =>
            q.eq("organizationId", ctx.organizationId).eq("name", name),
          )
          .first();
        if (existing) {
          throw new ConvexError({
            code: ErrorCode.ALREADY_EXISTS,
            message: `A custom formula named "${name}" already exists`,
          });
        }
      }
      patch.name = name;
    }

    if (args.body !== undefined) {
      if (!args.body.startsWith("=")) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Formula body must start with "="',
        });
      }
      patch.body = args.body;
    }

    if (args.description !== undefined) {
      patch.description = args.description;
    }

    await ctx.db.patch(args.id, patch);
    return null;
  },
});

/** Delete a custom formula */
export const remove = ownerMutation({
  args: { id: v.id("customFormulas") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const formula = await ctx.db.get(args.id);
    if (!formula) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Custom formula not found",
      });
    }
    if (formula.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Unauthorized",
      });
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
