import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup expired slot locks",
  { minutes: 1 },
  internal.slotLocks.cleanupExpired,
  {},
);

export default crons;
