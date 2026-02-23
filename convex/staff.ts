import { ConvexError, v } from "convex/values";
import {
  authedQuery,
  ErrorCode,
  internalMutation,
  orgMutation,
  orgQuery,
  publicQuery,
} from "./lib/functions";
import { resolveScheduleRange } from "./lib/scheduleResolver";
import {
  staffDocValidator,
  staffScheduleValidator,
  staffStatusValidator,
} from "./lib/validators";

/**
 * List all active staff names for a salon (public).
 * Used on the design portfolio page for the staff filter.
 * Unlike listPublicActive, this does NOT filter by bookability.
 */
export const listNamesForOrg = publicQuery({
  args: { organizationId: v.id("organization") },
  returns: v.array(
    v.object({
      _id: v.id("staff"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();
    return staff.map((s) => ({
      _id: s._id,
      name: s.name,
      imageUrl: s.imageUrl,
    }));
  },
});

export const listPublicActive = publicQuery({
  args: { organizationId: v.id("organization") },
  returns: v.array(
    v.object({
      _id: v.id("staff"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
      bio: v.optional(v.string()),
      serviceIds: v.optional(v.array(v.id("services"))),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    // Filter out staff who can't be booked
    const bookableStaff = staff.filter((s) => {
      const hasSchedule =
        s.defaultSchedule !== undefined && s.defaultSchedule !== null;
      const hasServices = s.serviceIds !== undefined && s.serviceIds.length > 0;
      return hasSchedule && hasServices;
    });

    return bookableStaff.map((s) => ({
      _id: s._id,
      name: s.name,
      imageUrl: s.imageUrl,
      bio: s.bio,
      serviceIds: s.serviceIds,
    }));
  },
});

export const list = orgQuery({
  args: {},
  returns: v.array(staffDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();
  },
});

/**
 * List active staff members in an organization
 */
export const listActive = orgQuery({
  args: {},
  returns: v.array(staffDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();
  },
});

export const getByUser = orgQuery({
  args: { userId: v.string() },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("userId", args.userId),
      )
      .first();
  },
});

export const getCurrentStaff = authedQuery({
  args: { organizationId: v.id("organization") },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", ctx.user._id),
      )
      .first();
  },
});

export const get = orgQuery({
  args: { staffId: v.id("staff") },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.organizationId !== ctx.organizationId) {
      return null;
    }

    return staff;
  },
});

export const createProfile = orgMutation({
  args: {
    userId: v.string(),
    memberId: v.id("member"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(staffStatusValidator),
    serviceIds: v.optional(v.array(v.id("services"))),
    defaultSchedule: v.optional(staffScheduleValidator),
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    // Permission: creating for someone else requires owner role
    if (args.userId !== ctx.user._id && ctx.member.role !== "owner") {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to add staff to this organization",
      });
    }

    // Creating own profile: verify valid member record
    if (args.userId === ctx.user._id) {
      const membership = await ctx.db.get(args.memberId);
      if (
        !membership ||
        membership.userId !== ctx.user._id ||
        membership.organizationId !== ctx.organizationId
      ) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid membership record",
        });
      }
    }

    const existing = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("userId", args.userId),
      )
      .first();

    if (existing) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "Staff profile already exists for this user",
      });
    }

    const now = Date.now();

    const defaultSchedule = args.defaultSchedule ?? {
      monday: { available: true, start: "09:00", end: "17:00" },
      tuesday: { available: true, start: "09:00", end: "17:00" },
      wednesday: { available: true, start: "09:00", end: "17:00" },
      thursday: { available: true, start: "09:00", end: "17:00" },
      friday: { available: true, start: "09:00", end: "17:00" },
      saturday: { available: false, start: "", end: "" },
      sunday: { available: false, start: "", end: "" },
    };

    const staffId = await ctx.db.insert("staff", {
      userId: args.userId,
      organizationId: ctx.organizationId,
      memberId: args.memberId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      imageUrl: args.imageUrl,
      bio: args.bio,
      status: args.status ?? "active",
      serviceIds: args.serviceIds ?? [],
      defaultSchedule,
      createdAt: now,
      updatedAt: now,
    });

    return staffId;
  },
});

export const updateProfile = orgMutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(staffStatusValidator),
    serviceIds: v.optional(v.array(v.id("services"))),
    defaultSchedule: v.optional(staffScheduleValidator),
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    // Permission: only own profile or owner
    if (staff.userId !== ctx.user._id && ctx.member.role !== "owner") {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to update this staff profile",
      });
    }

    const { staffId, ...updateFields } = args;

    // Filter out undefined values
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(staffId, updates);

    return staffId;
  },
});

export const getResolvedSchedule = orgQuery({
  args: {
    staffId: v.id("staff"),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      available: v.boolean(),
      effectiveStart: v.union(v.string(), v.null()),
      effectiveEnd: v.union(v.string(), v.null()),
      overtimeWindows: v.array(
        v.object({ start: v.string(), end: v.string() }),
      ),
      overrideType: v.union(
        v.literal("custom_hours"),
        v.literal("day_off"),
        v.literal("time_off"),
        v.null(),
      ),
      isTimeOff: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    // Fetch overrides in date range using index range query
    const filteredOverrides = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_staff_date", (q) =>
        q
          .eq("staffId", args.staffId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    // Fetch overtime entries in date range using index range query
    const filteredOvertime = await ctx.db
      .query("staffOvertime")
      .withIndex("by_staff_date", (q) =>
        q
          .eq("staffId", args.staffId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    return resolveScheduleRange({
      startDate: args.startDate,
      endDate: args.endDate,
      defaultSchedule: staff.defaultSchedule ?? undefined,
      overrides: filteredOverrides,
      overtimeEntries: filteredOvertime,
    });
  },
});

export const migrateStaffSchedules = internalMutation({
  args: {},
  returns: v.object({
    migrated: v.number(),
    total: v.number(),
  }),
  handler: async (ctx) => {
    const allStaff = await ctx.db.query("staff").collect();

    const defaultSchedule = {
      monday: { available: true, start: "09:00", end: "17:00" },
      tuesday: { available: true, start: "09:00", end: "17:00" },
      wednesday: { available: true, start: "09:00", end: "17:00" },
      thursday: { available: true, start: "09:00", end: "17:00" },
      friday: { available: true, start: "09:00", end: "17:00" },
      saturday: { available: false, start: "", end: "" },
      sunday: { available: false, start: "", end: "" },
    };

    let migrated = 0;
    for (const staff of allStaff) {
      if (!staff.defaultSchedule) {
        await ctx.db.patch(staff._id, { defaultSchedule });
        migrated++;
      }
    }

    return { migrated, total: allStaff.length };
  },
});
