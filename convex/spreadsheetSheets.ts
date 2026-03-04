import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerMutation, ownerQuery } from "./lib/functions";

const mergedRegionValidator = v.object({
  startRow: v.number(),
  startCol: v.number(),
  endRow: v.number(),
  endCol: v.number(),
});

/** List all freeform sheets for the organization, ordered by `order` */
export const list = ownerQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("spreadsheetSheets"),
      _creationTime: v.number(),
      organizationId: v.id("organization"),
      name: v.string(),
      order: v.number(),
      columnCount: v.optional(v.number()),
      rowCount: v.optional(v.number()),
      freezeRow: v.optional(v.number()),
      freezeCol: v.optional(v.number()),
      mergedRegions: v.optional(v.array(mergedRegionValidator)),
    }),
  ),
  handler: async (ctx) => {
    const sheets = await ctx.db
      .query("spreadsheetSheets")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
    return sheets.sort((a, b) => a.order - b.order);
  },
});

/** Create a new freeform sheet */
export const create = ownerMutation({
  args: { name: v.string() },
  returns: v.id("spreadsheetSheets"),
  handler: async (ctx, args) => {
    // Determine next order value
    const existing = await ctx.db
      .query("spreadsheetSheets")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
    const maxOrder = existing.reduce((max, s) => Math.max(max, s.order), -1);

    return await ctx.db.insert("spreadsheetSheets", {
      organizationId: ctx.organizationId,
      name: args.name,
      order: maxOrder + 1,
      columnCount: 10,
      rowCount: 20,
    });
  },
});

/** Rename a freeform sheet */
export const rename = ownerMutation({
  args: { id: v.id("spreadsheetSheets"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.id);
    if (!sheet) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Sheet not found",
      });
    }
    if (sheet.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Unauthorized",
      });
    }
    await ctx.db.patch(args.id, { name: args.name });
    return null;
  },
});

/** Delete a freeform sheet and all its cells */
export const remove = ownerMutation({
  args: { id: v.id("spreadsheetSheets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.organizationId !== ctx.organizationId) {
      // Already deleted or doesn't belong to this org — idempotent no-op
      return null;
    }

    // Delete all cells in this sheet (use org-scoped index)
    const cells = await ctx.db
      .query("spreadsheetCells")
      .withIndex("by_org_sheet", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("sheetId", args.id),
      )
      .collect();
    for (const cell of cells) {
      await ctx.db.delete(cell._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

/** Update the column count for a freeform sheet */
export const setColumnCount = ownerMutation({
  args: { id: v.id("spreadsheetSheets"), columnCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.organizationId !== ctx.organizationId) return null;
    const clamped = Math.max(1, Math.min(52, Math.round(args.columnCount)));
    await ctx.db.patch(args.id, { columnCount: clamped });
    return null;
  },
});

/** Update the row count for a freeform sheet */
export const setRowCount = ownerMutation({
  args: { id: v.id("spreadsheetSheets"), rowCount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.organizationId !== ctx.organizationId) return null;
    const clamped = Math.max(1, Math.min(200, Math.round(args.rowCount)));
    await ctx.db.patch(args.id, { rowCount: clamped });
    return null;
  },
});

/** Reorder sheets by providing the full ordered list of IDs */
export const reorder = ownerMutation({
  args: { orderedIds: v.array(v.id("spreadsheetSheets")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedIds.length; i++) {
      const sheet = await ctx.db.get(args.orderedIds[i]);
      if (sheet && sheet.organizationId === ctx.organizationId) {
        await ctx.db.patch(args.orderedIds[i], { order: i });
      }
    }
    return null;
  },
});

/** Set freeze pane rows/columns */
export const setFreeze = ownerMutation({
  args: {
    id: v.id("spreadsheetSheets"),
    freezeRow: v.number(),
    freezeCol: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.organizationId !== ctx.organizationId) return null;
    await ctx.db.patch(args.id, {
      freezeRow: Math.max(0, args.freezeRow),
      freezeCol: Math.max(0, args.freezeCol),
    });
    return null;
  },
});

/** Set merged regions for a sheet */
export const setMergedRegions = ownerMutation({
  args: {
    id: v.id("spreadsheetSheets"),
    mergedRegions: v.array(mergedRegionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.id);
    if (!sheet || sheet.organizationId !== ctx.organizationId) return null;
    await ctx.db.patch(args.id, { mergedRegions: args.mergedRegions });
    return null;
  },
});
