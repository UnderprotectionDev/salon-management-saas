/**
 * Default values for new organizations.
 * Used during organization creation (bootstrap) and potentially for migrations.
 */

export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "18:00", closed: false },
  sunday: { open: "09:00", close: "18:00", closed: true },
} as const;

export const DEFAULT_BOOKING_SETTINGS = {
  minAdvanceBookingMinutes: 60,
  maxAdvanceBookingDays: 30,
  slotDurationMinutes: 30,
  bufferBetweenBookingsMinutes: 0,
  allowOnlineBooking: true,
  requireDeposit: false,
  depositAmount: 0,
  cancellationPolicyHours: 24,
} as const;

export const DEFAULT_STAFF_SCHEDULE = {
  monday: { start: "09:00", end: "18:00", available: true },
  tuesday: { start: "09:00", end: "18:00", available: true },
  wednesday: { start: "09:00", end: "18:00", available: true },
  thursday: { start: "09:00", end: "18:00", available: true },
  friday: { start: "09:00", end: "18:00", available: true },
  saturday: { start: "09:00", end: "18:00", available: true },
  sunday: { start: "09:00", end: "18:00", available: false },
} as const;
