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

export default crons;
