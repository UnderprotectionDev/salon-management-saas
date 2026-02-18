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

crons.cron(
  "check care schedule reminders",
  "0 9 * * 1", // Every Monday at 9 AM UTC
  internal.aiCareSchedules.checkAndNotify,
  {},
);

export default crons;
