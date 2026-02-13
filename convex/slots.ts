import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getCurrentMinutes,
  getTodayDateString,
  isOverlapping,
  roundUpTo15,
  timeStringToMinutes,
} from "./lib/dateTime";
import { publicQuery } from "./lib/functions";
import { resolveSchedule } from "./lib/scheduleResolver";
import {
  availableSlotValidator,
  dateAvailabilityValidator,
} from "./lib/validators";

/**
 * Get available time slots for booking.
 * Public query — no authentication required.
 *
 * Algorithm:
 * 1. Read bookingSettings for slot duration, min advance, and online booking toggle
 * 2. Calculate total service duration (sum of selected services + buffer times)
 * 3. Round up to nearest slot increment
 * 4. Batch fetch org-wide schedule overrides, overtime, appointments, and locks
 * 5. For each eligible staff member:
 *    a. Resolve their schedule for the date (default + overrides + overtime)
 *    b. Filter batch data for this staff
 *    c. Generate slots within working hours, respecting buffers
 *    d. Filter out slots that overlap with existing bookings/locks
 * 6. Return sorted available slots with staff info
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

    // Read booking settings
    const orgSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    const bookingSettings = orgSettings?.bookingSettings;
    const timezone = orgSettings?.timezone ?? "Europe/Istanbul";
    const slotIncrement = bookingSettings?.slotDurationMinutes ?? 15;
    const minAdvanceMinutes = bookingSettings?.minAdvanceBookingMinutes ?? 0;
    const bufferBetweenBookings =
      bookingSettings?.bufferBetweenBookingsMinutes ?? 0;

    // If online booking is disabled, return empty
    if (bookingSettings?.allowOnlineBooking === false) {
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
    // Add service-level buffer times (sum of all service buffers)
    const totalBufferTime = validServices.reduce(
      (sum, s) => sum + (s.bufferTime ?? 0),
      0,
    );
    const effectiveDuration = totalDuration + totalBufferTime;
    const slotDuration = roundUpTo15(effectiveDuration);

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
      return [];
    }

    const now = Date.now();

    // Calculate minimum start time (current time + min advance, for today only)
    const todayStr = getTodayDateString(timezone);
    const isToday = args.date === todayStr;
    const currentMinutes = isToday ? getCurrentMinutes(timezone) : 0;
    const minStartTime = isToday ? currentMinutes + minAdvanceMinutes : 0;

    // 4. Batch fetch org-wide data (4 queries total instead of 4 per staff)
    const staffIds = staffMembers.map((s) => s._id);

    // Batch fetch org-wide overrides, overtime, and appointments (3 queries via org index)
    // Locks don't have an org_date index, so we fetch per-staff in parallel
    const [allOverrides, allOvertime, allAppointments, ...lockArrays] =
      await Promise.all([
        ctx.db
          .query("scheduleOverrides")
          .withIndex("by_org_date", (q) =>
            q.eq("organizationId", args.organizationId).eq("date", args.date),
          )
          .collect(),
        ctx.db
          .query("staffOvertime")
          .withIndex("by_org_date", (q) =>
            q.eq("organizationId", args.organizationId).eq("date", args.date),
          )
          .collect(),
        ctx.db
          .query("appointments")
          .withIndex("by_org_date", (q) =>
            q.eq("organizationId", args.organizationId).eq("date", args.date),
          )
          .collect(),
        ...staffIds.map((sid) =>
          ctx.db
            .query("slotLocks")
            .withIndex("by_staff_date", (q) =>
              q.eq("staffId", sid).eq("date", args.date),
            )
            .collect(),
        ),
      ]);

    const orgLocks = lockArrays.flat();

    // Build maps for quick filtering by staffId
    const overridesByStaff = new Map<Id<"staff">, Doc<"scheduleOverrides">>();
    for (const o of allOverrides) {
      overridesByStaff.set(o.staffId, o);
    }
    const overtimeByStaff = new Map<Id<"staff">, Doc<"staffOvertime">[]>();
    for (const o of allOvertime) {
      const list = overtimeByStaff.get(o.staffId) ?? [];
      list.push(o);
      overtimeByStaff.set(o.staffId, list);
    }
    const appointmentsByStaff = new Map<Id<"staff">, Doc<"appointments">[]>();
    for (const a of allAppointments) {
      if (a.staffId) {
        const list = appointmentsByStaff.get(a.staffId) ?? [];
        list.push(a);
        appointmentsByStaff.set(a.staffId, list);
      }
    }
    const locksByStaff = new Map<Id<"staff">, typeof orgLocks>();
    for (const l of orgLocks) {
      const list = locksByStaff.get(l.staffId) ?? [];
      list.push(l);
      locksByStaff.set(l.staffId, list);
    }

    const slots: Array<{
      staffId: Id<"staff">;
      staffName: string;
      staffImageUrl: string | undefined;
      startTime: number;
      endTime: number;
    }> = [];

    // 5. For each staff, compute available slots using pre-fetched data
    for (const staff of staffMembers) {
      const override = overridesByStaff.get(staff._id) ?? null;
      const overtimeEntries = overtimeByStaff.get(staff._id) ?? [];

      const resolved = resolveSchedule({
        date: args.date,
        defaultSchedule: staff.defaultSchedule ?? undefined,
        override,
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

      // Get active appointments for this staff from batch data
      const staffAppts = appointmentsByStaff.get(staff._id) ?? [];
      const activeAppointments = staffAppts.filter(
        (a) => a.status !== "cancelled" && a.status !== "no_show",
      );

      // Get active slot locks for this staff from batch data
      const staffLocks = locksByStaff.get(staff._id) ?? [];
      const activeLocks = staffLocks.filter(
        (l) => l.expiresAt > now && l.sessionId !== args.sessionId,
      );

      // Combine blocked ranges (with buffer between bookings)
      const blocked = [
        ...activeAppointments.map((a) => ({
          start: a.startTime - bufferBetweenBookings,
          end: a.endTime + bufferBetweenBookings,
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
          start += slotIncrement
        ) {
          // Skip past slots (for today)
          if (start < minStartTime) continue;

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

/**
 * Get date availability for a date range.
 * Returns which dates have available slots (lightweight).
 */
export const availableDates = publicQuery({
  args: {
    organizationId: v.id("organization"),
    serviceIds: v.array(v.id("services")),
    staffId: v.optional(v.id("staff")),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(dateAvailabilityValidator),
  handler: async (ctx, args) => {
    if (args.serviceIds.length === 0) return [];

    // Read org settings
    const orgSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    const bookingSettings = orgSettings?.bookingSettings;
    const timezone = orgSettings?.timezone ?? "Europe/Istanbul";
    const businessHours = orgSettings?.businessHours;
    const slotIncrement = bookingSettings?.slotDurationMinutes ?? 15;
    const minAdvanceMinutes = bookingSettings?.minAdvanceBookingMinutes ?? 0;
    const bufferBetweenBookings =
      bookingSettings?.bufferBetweenBookingsMinutes ?? 0;

    if (bookingSettings?.allowOnlineBooking === false) return [];

    // Fetch services
    const services = await Promise.all(
      args.serviceIds.map((id) => ctx.db.get(id)),
    );
    const validServices = services.filter(
      (s): s is Doc<"services"> =>
        s !== null &&
        s.status === "active" &&
        s.organizationId === args.organizationId,
    );
    if (validServices.length !== args.serviceIds.length) return [];

    const totalDuration = validServices.reduce((sum, s) => sum + s.duration, 0);
    const totalBufferTime = validServices.reduce(
      (sum, s) => sum + (s.bufferTime ?? 0),
      0,
    );
    const slotDuration = roundUpTo15(totalDuration + totalBufferTime);

    // Get eligible staff
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

    staffMembers = staffMembers.filter((staff) => {
      const staffServiceIds = staff.serviceIds ?? [];
      return args.serviceIds.every((sid) => staffServiceIds.includes(sid));
    });

    if (staffMembers.length === 0) return [];

    // Generate dates in range
    const dates: string[] = [];
    const current = new Date(`${args.startDate}T00:00:00Z`);
    const last = new Date(`${args.endDate}T00:00:00Z`);
    while (current <= last) {
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, "0");
      const d = String(current.getUTCDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const todayStr = getTodayDateString(timezone);
    const currentMinutes = getCurrentMinutes(timezone);
    const now = Date.now();

    // Batch fetch all appointments in range
    const allAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    const appointmentsByDate = new Map<string, Doc<"appointments">[]>();
    for (const a of allAppointments) {
      const list = appointmentsByDate.get(a.date) ?? [];
      list.push(a);
      appointmentsByDate.set(a.date, list);
    }

    // Day of week mapping
    const DAY_NAMES = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;

    const results: Array<{
      date: string;
      hasAvailability: boolean;
      slotCount: number;
    }> = [];

    for (const dateStr of dates) {
      // Quick check: is this date a closed business day?
      const dateObj = new Date(`${dateStr}T00:00:00Z`);
      const dayName = DAY_NAMES[dateObj.getUTCDay()];
      const dayHours = businessHours?.[dayName];
      const isBusinessClosed = dayHours?.closed === true;

      if (isBusinessClosed) {
        results.push({ date: dateStr, hasAvailability: false, slotCount: 0 });
        continue;
      }

      const isToday = dateStr === todayStr;
      const minStart = isToday ? currentMinutes + minAdvanceMinutes : 0;
      // Past dates
      if (dateStr < todayStr) {
        results.push({ date: dateStr, hasAvailability: false, slotCount: 0 });
        continue;
      }

      const dateAppts = appointmentsByDate.get(dateStr) ?? [];
      let slotCount = 0;

      // For each staff, check if any slot is available
      // Note: uses defaultSchedule only for performance (overrides/overtime are
      // intentionally ignored here — the full `available` query resolves them).
      for (const staff of staffMembers) {
        const daySchedule = staff.defaultSchedule?.[dayName];
        if (!daySchedule?.available) continue;

        const scheduleStart = timeStringToMinutes(daySchedule.start);
        const scheduleEnd = timeStringToMinutes(daySchedule.end);

        // Active appointments for this staff on this date
        const staffAppts = dateAppts.filter(
          (a) =>
            a.staffId === staff._id &&
            a.status !== "cancelled" &&
            a.status !== "no_show",
        );

        const blocked = staffAppts.map((a) => ({
          start: a.startTime - bufferBetweenBookings,
          end: a.endTime + bufferBetweenBookings,
        }));

        // Count available slots
        for (
          let start = scheduleStart;
          start + slotDuration <= scheduleEnd;
          start += slotIncrement
        ) {
          if (start < minStart) continue;
          const end = start + slotDuration;
          const hasConflict = blocked.some((b) =>
            isOverlapping(start, end, b.start, b.end),
          );
          if (!hasConflict) {
            slotCount++;
          }
        }

        // Continue to accumulate total slots across all staff
      }

      results.push({
        date: dateStr,
        hasAvailability: slotCount > 0,
        slotCount,
      });
    }

    return results;
  },
});
