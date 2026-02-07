import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { publicQuery } from "./lib/functions";
import {
  isOverlapping,
  roundUpTo15,
  timeStringToMinutes,
} from "./lib/dateTime";
import { resolveSchedule, getDayOfWeek } from "./lib/scheduleResolver";
import { availableSlotValidator } from "./lib/validators";

/**
 * Get available time slots for booking.
 * Public query — no authentication required.
 *
 * Algorithm:
 * 1. Calculate total service duration (sum of selected services)
 * 2. Round up to nearest 15 minutes
 * 3. For each eligible staff member:
 *    a. Resolve their schedule for the date (default + overrides + overtime)
 *    b. Get existing appointments and active slot locks
 *    c. Generate 15-minute increment slots within working hours
 *    d. Filter out slots that overlap with existing bookings/locks
 * 4. Return sorted available slots with staff info
 */
export const available = publicQuery({
  args: {
    organizationId: v.id("organization"),
    date: v.string(),
    serviceIds: v.array(v.id("services")),
    staffId: v.optional(v.id("staff")),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(availableSlotValidator),
  handler: async (ctx, args) => {
    if (args.serviceIds.length === 0) {
      return [];
    }

    // 1. Fetch services and calculate total duration
    const services = await Promise.all(
      args.serviceIds.map((id) => ctx.db.get(id)),
    );
    const validServices = services.filter(
      (s): s is Doc<"services"> =>
        s !== null &&
        s.status === "active" &&
        s.organizationId === args.organizationId,
    );
    if (validServices.length !== args.serviceIds.length) {
      return []; // Some services invalid
    }

    const totalDuration = validServices.reduce((sum, s) => sum + s.duration, 0);
    const slotDuration = roundUpTo15(totalDuration);

    // 2. Get eligible staff
    let staffMembers;
    if (args.staffId) {
      const staff = await ctx.db.get(args.staffId);
      staffMembers =
        staff &&
        staff.status === "active" &&
        staff.organizationId === args.organizationId
          ? [staff]
          : [];
    } else {
      staffMembers = await ctx.db
        .query("staff")
        .withIndex("organizationId_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "active"),
        )
        .collect();
    }

    // 3. Filter staff who can perform ALL selected services
    staffMembers = staffMembers.filter((staff) => {
      const staffServiceIds = staff.serviceIds ?? [];
      return args.serviceIds.every((sid) => staffServiceIds.includes(sid));
    });

    if (staffMembers.length === 0) {
      console.warn(
        `No eligible staff for services ${args.serviceIds.join(", ")} in org ${args.organizationId}`,
      );
      return [];
    }

    const now = Date.now();
    const slots: Array<{
      staffId: (typeof staffMembers)[0]["_id"];
      staffName: string;
      staffImageUrl: string | undefined;
      startTime: number;
      endTime: number;
    }> = [];

    // 4. For each staff, compute available slots
    for (const staff of staffMembers) {
      // Get schedule override for this date
      const override = await ctx.db
        .query("scheduleOverrides")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staff._id).eq("date", args.date),
        )
        .first();

      // Get overtime entries for this date
      const overtimeEntries = await ctx.db
        .query("staffOvertime")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staff._id).eq("date", args.date),
        )
        .collect();

      const resolved = resolveSchedule({
        date: args.date,
        defaultSchedule: staff.defaultSchedule ?? undefined,
        override: override ?? null,
        overtimeEntries,
      });

      // Build working windows (main schedule + overtime)
      const windows: Array<{ start: number; end: number }> = [];

      if (
        resolved.available &&
        resolved.effectiveStart &&
        resolved.effectiveEnd
      ) {
        windows.push({
          start: timeStringToMinutes(resolved.effectiveStart),
          end: timeStringToMinutes(resolved.effectiveEnd),
        });
      }

      // Add overtime windows as additional availability
      for (const ot of resolved.overtimeWindows) {
        windows.push({
          start: timeStringToMinutes(ot.start),
          end: timeStringToMinutes(ot.end),
        });
      }

      if (windows.length === 0) continue;

      // Merge overlapping windows to avoid duplicate slots
      windows.sort((a, b) => a.start - b.start);
      const mergedWindows: typeof windows = [];
      for (const w of windows) {
        const last = mergedWindows[mergedWindows.length - 1];
        if (last && w.start <= last.end) {
          last.end = Math.max(last.end, w.end);
        } else {
          mergedWindows.push({ ...w });
        }
      }

      // Get existing appointments for this staff + date (non-cancelled)
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staff._id).eq("date", args.date),
        )
        .collect();
      const activeAppointments = appointments.filter(
        (a) => a.status !== "cancelled" && a.status !== "no_show",
      );

      // Get active slot locks for this staff + date
      const locks = await ctx.db
        .query("slotLocks")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", staff._id).eq("date", args.date),
        )
        .collect();
      const activeLocks = locks.filter(
        (l) => l.expiresAt > now && l.sessionId !== args.sessionId,
      );

      // Combine blocked ranges
      const blocked = [
        ...activeAppointments.map((a) => ({
          start: a.startTime,
          end: a.endTime,
        })),
        ...activeLocks.map((l) => ({
          start: l.startTime,
          end: l.endTime,
        })),
      ];

      // Generate slots for each working window
      for (const window of mergedWindows) {
        for (
          let start = window.start;
          start + slotDuration <= window.end;
          start += 15
        ) {
          const end = start + slotDuration;
          const hasConflict = blocked.some((b) =>
            isOverlapping(start, end, b.start, b.end),
          );
          if (!hasConflict) {
            slots.push({
              staffId: staff._id,
              staffName: staff.name,
              staffImageUrl: staff.imageUrl,
              startTime: start,
              endTime: end,
            });
          }
        }
      }
    }

    // Sort by time, then by staff name
    slots.sort(
      (a, b) =>
        a.startTime - b.startTime || a.staffName.localeCompare(b.staffName),
    );

    return slots;
  },
});
