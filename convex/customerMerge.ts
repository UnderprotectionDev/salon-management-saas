import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerMutation } from "./lib/functions";

// =============================================================================
// Customer Merge
// =============================================================================

/**
 * Merge two customer records
 * Keeps primary, merges stats from duplicate, deletes duplicate
 * Admin/owner only
 */
export const merge = ownerMutation({
  args: {
    primaryCustomerId: v.id("customers"),
    duplicateCustomerId: v.id("customers"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.primaryCustomerId === args.duplicateCustomerId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot merge a customer with itself",
      });
    }

    const primary = await ctx.db.get(args.primaryCustomerId);
    if (!primary || primary.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Primary customer not found",
      });
    }

    const duplicate = await ctx.db.get(args.duplicateCustomerId);
    if (!duplicate || duplicate.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Duplicate customer not found",
      });
    }

    // Merge stats
    const mergedVisits =
      (primary.totalVisits ?? 0) + (duplicate.totalVisits ?? 0);
    const mergedSpent = (primary.totalSpent ?? 0) + (duplicate.totalSpent ?? 0);
    const mergedNoShows =
      (primary.noShowCount ?? 0) + (duplicate.noShowCount ?? 0);

    // Pick latest visit date
    let mergedLastVisit = primary.lastVisitDate;
    if (
      duplicate.lastVisitDate &&
      (!mergedLastVisit || duplicate.lastVisitDate > mergedLastVisit)
    ) {
      mergedLastVisit = duplicate.lastVisitDate;
    }

    // Merge tags (union)
    const primaryTags = primary.tags ?? [];
    const duplicateTags = duplicate.tags ?? [];
    const mergedTags = [...new Set([...primaryTags, ...duplicateTags])];

    // Take duplicate's notes if primary is missing
    const mergedCustomerNotes =
      primary.customerNotes || duplicate.customerNotes;
    const mergedStaffNotes = primary.staffNotes || duplicate.staffNotes;

    // Reassign all appointments from duplicate to primary
    const duplicateAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_customer", (q) =>
        q.eq("customerId", args.duplicateCustomerId),
      )
      .collect();

    for (const apt of duplicateAppointments) {
      await ctx.db.patch(apt._id, { customerId: args.primaryCustomerId });
    }

    // Update primary with merged data
    await ctx.db.patch(args.primaryCustomerId, {
      totalVisits: mergedVisits,
      totalSpent: mergedSpent,
      noShowCount: mergedNoShows,
      lastVisitDate: mergedLastVisit,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
      customerNotes: mergedCustomerNotes,
      staffNotes: mergedStaffNotes,
      updatedAt: Date.now(),
    });

    // Delete duplicate
    await ctx.db.delete(args.duplicateCustomerId);

    return { success: true };
  },
});
