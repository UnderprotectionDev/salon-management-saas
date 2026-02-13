import { ConvexError, v } from "convex/values";
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
    const today = new Date(now);
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Current time in minutes from midnight
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const windowStart = currentMinutes + 25;
    const windowEnd = currentMinutes + 35;

    // Get all orgs, then query each org's appointments for today via index
    const orgs = await ctx.db.query("organization").collect();

    const todayAppts = [];
    for (const org of orgs) {
      const orgAppts = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q.eq("organizationId", org._id).eq("date", dateStr),
        )
        .filter((q) =>
          q.and(
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "confirmed"),
            ),
            q.eq(q.field("reminderSentAt"), undefined),
          ),
        )
        .collect();

      for (const a of orgAppts) {
        if (a.startTime >= windowStart && a.startTime <= windowEnd) {
          todayAppts.push(a);
        }
      }
    }

    for (const appt of todayAppts) {
      // Skip if no staff assigned
      if (!appt.staffId) {
        await ctx.db.patch(appt._id, { reminderSentAt: now });
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

      // Mark reminder as sent
      await ctx.db.patch(appt._id, { reminderSentAt: now });
    }

    return null;
  },
});

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
