"use client";

import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  HOUR_HEIGHT,
} from "../lib/constants";

export function TimeAxis() {
  const hours = Array.from(
    { length: DEFAULT_END_HOUR - DEFAULT_START_HOUR },
    (_, i) => DEFAULT_START_HOUR + i,
  );

  return (
    <div className="relative w-16 shrink-0 border-r">
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative border-b border-dashed border-muted"
          style={{ height: HOUR_HEIGHT }}
        >
          <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground tabular-nums">
            {String(hour).padStart(2, "0")}:00
          </span>
        </div>
      ))}
    </div>
  );
}
