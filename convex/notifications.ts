import { ConvexError, v } from "convex/values";
import {
  addDays,
  getCurrentMinutes,
  getTodayDateString,
} from "./lib/dateTime";
import {
  ErrorCode,
  internalMutation,
  orgMutation,
  orgQuery,
} from "./lib/functions";
import {
  notificationDocValidator,
  notificationTypeValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List notifications for the current staff member.
 * Sorted by createdAt desc, limited to 50.
 */
export const list = orgQuery({
  args: {},
  returns: v.array(notificationDocValidator),
  handler: async (ctx) => {
    if (!ctx.staff) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_org_staff", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("recipientStaffId", ctx.staff!._id),
      )
      .collect();

    // Sort by createdAt desc and limit to 50
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    return notifications.slice(0, 50);
  },
});

/**
 * Get unread notification count for current staff.
 */
export const getUnreadCount = orgQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    if (!ctx.staff) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_org_staff", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("recipientStaffId", ctx.staff!._id),
      )
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unread.length;
  },
});

/**
 * Get the most recent notification for the current staff member.
 * Used by the reactive toast system to detect new notifications.
 */
export const getLatest = orgQuery({
  args: {},
  returns: v.union(notificationDocValidator, v.null()),
  handler: async (ctx) => {
    if (!ctx.staff) return null;

    // Query by org+staff index, ordered desc by _creationTime (default),
    // and take the first (most recent) notification
    return await ctx.db
      .query("notifications")
      .withIndex("by_org_staff", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("recipientStaffId", ctx.staff!._id),
      )
      .order("desc")
      .first();
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Mark a single notification as read.
 */
export const markAsRead = orgMutation({
  args: { notificationId: v.id("notifications") },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.organizationId !== ctx.organizationId ||
      notification.recipientStaffId !== ctx.staff?._id
    ) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Notification not found",
      });
    }

    if (!notification.isRead) {
      await ctx.db.patch(args.notificationId, {
        isRead: true,
        readAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Mark all notifications as read for current staff.
 */
export const markAllAsRead = orgMutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    if (!ctx.staff) return { success: true };

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_org_staff", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("recipientStaffId", ctx.staff!._id),
      )
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    const now = Date.now();
    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true, readAt: now });
    }

    return { success: true };
  },
});

/**
 * Delete all notifications for current staff.
 */
export const deleteAll = orgMutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    if (!ctx.staff) return { success: true };

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_org_staff", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("recipientStaffId", ctx.staff!._id),
      )
      .collect();

    for (const n of notifications) {
      await ctx.db.delete(n._id);
    }

    return { success: true };
  },
});

// =============================================================================
// Internal Mutations (system-only)
// =============================================================================

/**
 * Create a notification (called by appointment triggers via scheduler).
 */
export const createNotification = internalMutation({
  args: {
    organizationId: v.id("organization"),
    recipientStaffId: v.id("staff"),
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    return ctx.db.insert("notifications", {
      organizationId: args.organizationId,
      recipientStaffId: args.recipientStaffId,
      type: args.type,
      title: args.title,
      message: args.message,
      appointmentId: args.appointmentId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Notify all staff in an organization about a booking event.
 */
export const notifyAllStaff = internalMutation({
  args: {
    organizationId: v.id("organization"),
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const staffMembers = await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    const activeStaff = staffMembers.filter((s) => s.status === "active");
    const now = Date.now();

    for (const staff of activeStaff) {
      await ctx.db.insert("notifications", {
        organizationId: args.organizationId,
        recipientStaffId: staff._id,
        type: args.type,
        title: args.title,
        message: args.message,
        appointmentId: args.appointmentId,
        isRead: false,
        createdAt: now,
      });
    }

    return null;
  },
});

/**
 * Clean up notifications older than 7 days.
 */
export const cleanupOld = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", sevenDaysAgo))
      .collect();

    for (const n of oldNotifications) {
      await ctx.db.delete(n._id);
    }

    return null;
  },
});

/**
 * Send 30-minute reminder notifications for upcoming appointments.
 * Runs every 5 minutes via cron. Looks for appointments starting in 25-35 min window.
 */
export const sendReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    // TODO: Consider per-org timezone when multi-timezone support is needed.
    // Currently all salons operate in Turkey timezone.
    const timezone = "Europe/Istanbul";

    // Use timezone-aware date and time
    const dateStr = getTodayDateString(timezone);
    const currentMinutes = getCurrentMinutes(timezone);
    const windowStart = currentMinutes + 25;
    const windowEnd = currentMinutes + 35;

    // Handle midnight boundary: if window crosses into next day (windowEnd > 1439),
    // we need to also check early-morning appointments on the next date.
    const crossesMidnight = windowEnd > 1439;
    const nextDateStr = crossesMidnight ? addDays(dateStr, 1) : null;
    const wrappedWindowEnd = crossesMidnight ? windowEnd - 1440 : windowEnd;

    // Query confirmed/pending appointments via by_status_date index
    const pendingAppts = await ctx.db
      .query("appointments")
      .withIndex("by_status_date", (q) =>
        q.eq("status", "pending").eq("date", dateStr),
      )
      .collect();
    const confirmedAppts = await ctx.db
      .query("appointments")
      .withIndex("by_status_date", (q) =>
        q.eq("status", "confirmed").eq("date", dateStr),
      )
      .collect();

    // Also query next day's appointments if window crosses midnight
    let nextDayAppts: typeof pendingAppts = [];
    if (nextDateStr) {
      const nextPending = await ctx.db
        .query("appointments")
        .withIndex("by_status_date", (q) =>
          q.eq("status", "pending").eq("date", nextDateStr),
        )
        .collect();
      const nextConfirmed = await ctx.db
        .query("appointments")
        .withIndex("by_status_date", (q) =>
          q.eq("status", "confirmed").eq("date", nextDateStr),
        )
        .collect();
      nextDayAppts = [...nextPending, ...nextConfirmed];
    }

    // Filter today's appointments: startTime within [windowStart, min(windowEnd, 1439)]
    const todayFiltered = [...pendingAppts, ...confirmedAppts].filter(
      (a) =>
        a.notificationReminderSentAt === undefined &&
        a.startTime >= windowStart &&
        a.startTime <= Math.min(windowEnd, 1439),
    );

    // Filter next day's appointments: startTime within [0, wrappedWindowEnd]
    const nextDayFiltered = nextDayAppts.filter(
      (a) =>
        a.notificationReminderSentAt === undefined &&
        a.startTime >= 0 &&
        a.startTime <= wrappedWindowEnd,
    );

    const todayAppts = [...todayFiltered, ...nextDayFiltered];

    for (const appt of todayAppts) {
      // Skip if no staff assigned
      if (!appt.staffId) {
        await ctx.db.patch(appt._id, { notificationReminderSentAt: now });
        continue;
      }

      // Create reminder for the assigned staff
      await ctx.db.insert("notifications", {
        organizationId: appt.organizationId,
        recipientStaffId: appt.staffId,
        type: "reminder_30min",
        title: "Upcoming Appointment",
        message: `Appointment starting in ~30 minutes (${formatMinutes(appt.startTime)})`,
        appointmentId: appt._id,
        isRead: false,
        createdAt: now,
      });

      // Mark notification reminder as sent
      await ctx.db.patch(appt._id, { notificationReminderSentAt: now });
    }

    return null;
  },
});

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
