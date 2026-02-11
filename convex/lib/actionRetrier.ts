import { ActionRetrier } from "@convex-dev/action-retrier";
import { components } from "../_generated/api";

export const emailRetrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 1000,
  base: 2,
  maxFailures: 2, // 3 total attempts (initial + 2 retries) — matches previous behavior
});
