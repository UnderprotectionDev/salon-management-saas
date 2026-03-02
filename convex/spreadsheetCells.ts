import { v } from "convex/values";
import { ownerMutation, ownerQuery } from "./lib/functions";

const cellFormatFields = {
  bold: v.optional(v.boolean()),
  italic: v.optional(v.boolean()),
  underline: v.optional(v.boolean()),
  align: v.optional(
    v.union(v.literal("left"), v.literal("center"), v.literal("right")),
  ),
  fontSize: v.optional(v.string()),
  fontFamily: v.optional(v.string()),
  bgColor: v.optional(v.string()),
  textColor: v.optional(v.string()),
  numberFormat: v.optional(v.string()),
};

/** List all cells for a given sheet */
export const listBySheet = ownerQuery({
  args: { sheetId: v.id("spreadsheetSheets") },
  returns: v.array(
    v.object({
      _id: v.id("spreadsheetCells"),
      _creationTime: v.number(),
      organizationId: v.id("organization"),
      sheetId: v.id("spreadsheetSheets"),
      cellRef: v.string(),
      value: v.string(),
      ...cellFormatFields,
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("spreadsheetCells")
      .withIndex("by_org_sheet", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("sheetId", args.sheetId),
      )
      .collect();
  },
});

/** Upsert a single cell (create or update) */
export const upsertCell = ownerMutation({
  args: {
    sheetId: v.id("spreadsheetSheets"),
    cellRef: v.string(),
    value: v.string(),
    ...cellFormatFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find existing cell
    const existing = await ctx.db
      .query("spreadsheetCells")
      .withIndex("by_org_sheet", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("sheetId", args.sheetId),
      )
      .filter((q) => q.eq(q.field("cellRef"), args.cellRef))
      .first();

    const { sheetId, cellRef, value, ...format } = args;

    if (existing) {
      await ctx.db.patch(existing._id, { value, ...format });
    } else {
      // Only insert if there's actually content
      if (value || Object.values(format).some((v) => v !== undefined)) {
        await ctx.db.insert("spreadsheetCells", {
          organizationId: ctx.organizationId,
          sheetId,
          cellRef,
          value,
          ...format,
        });
      }
    }
    return null;
  },
});

/** Bulk upsert cells for a sheet */
export const bulkUpsert = ownerMutation({
  args: {
    sheetId: v.id("spreadsheetSheets"),
    cells: v.array(
      v.object({
        cellRef: v.string(),
        value: v.string(),
        ...cellFormatFields,
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Load all existing cells for this sheet into a map
    const existingCells = await ctx.db
      .query("spreadsheetCells")
      .withIndex("by_org_sheet", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("sheetId", args.sheetId),
      )
      .collect();

    const cellMap = new Map(existingCells.map((c) => [c.cellRef, c]));

    for (const cell of args.cells) {
      const existing = cellMap.get(cell.cellRef);
      const { cellRef, value, ...format } = cell;

      if (existing) {
        await ctx.db.patch(existing._id, { value, ...format });
      } else if (value || Object.values(format).some((v) => v !== undefined)) {
        await ctx.db.insert("spreadsheetCells", {
          organizationId: ctx.organizationId,
          sheetId: args.sheetId,
          cellRef,
          value,
          ...format,
        });
      }
    }
    return null;
  },
});

/** Replace ALL cells for a sheet atomically (delete all, then insert new) */
export const replaceAllCells = ownerMutation({
  args: {
    sheetId: v.id("spreadsheetSheets"),
    cells: v.array(
      v.object({
        cellRef: v.string(),
        value: v.string(),
        ...cellFormatFields,
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete all existing cells for this sheet
    const existingCells = await ctx.db
      .query("spreadsheetCells")
      .withIndex("by_org_sheet", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("sheetId", args.sheetId),
      )
      .collect();

    for (const cell of existingCells) {
      await ctx.db.delete(cell._id);
    }

    // Insert new cells
    for (const cell of args.cells) {
      const { cellRef, value, ...format } = cell;
      if (value || Object.values(format).some((v) => v !== undefined)) {
        await ctx.db.insert("spreadsheetCells", {
          organizationId: ctx.organizationId,
          sheetId: args.sheetId,
          cellRef,
          value,
          ...format,
        });
      }
    }
    return null;
  },
});

/** Delete all cells for a sheet (used before sheet deletion) */
export const deleteBySheet = ownerMutation({
  args: { sheetId: v.id("spreadsheetSheets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cells = await ctx.db
      .query("spreadsheetCells")
      .withIndex("by_org_sheet", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("sheetId", args.sheetId),
      )
      .collect();
    for (const cell of cells) {
      await ctx.db.delete(cell._id);
    }
    return null;
  },
});
