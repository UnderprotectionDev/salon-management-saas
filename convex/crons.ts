import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup expired slot locks",
  { minutes: 1 },
  internal.slotLocks.cleanupExpired,
  {},
);

crons.interval(
  "cleanup old notifications",
  { hours: 1 },
  internal.notifications.cleanupOld,
  {},
);

crons.interval(
  "send 30-minute reminders",
  { minutes: 5 },
  internal.notifications.sendReminders,
  {},
);

crons.interval(
  "check grace period expirations",
  { hours: 1 },
  internal.subscriptions.checkGracePeriods,
  {},
);

crons.interval(
  "check trial expirations",
  { hours: 1 },
  internal.subscriptions.checkTrialExpirations,
  {},
);

crons.interval(
  "sync Polar products",
  { hours: 1 },
  internal.polarSync.syncProducts,
  {},
);

crons.interval(
  "expire old invitations",
  { hours: 1 },
  internal.invitations.expireOldInvitations,
  {},
);

crons.daily(
  "send 24-hour advance email reminders",
  { hourUTC: 9, minuteUTC: 0 },
  internal.email_helpers.send24HourRemindersDaily,
  {},
);

export default crons;
