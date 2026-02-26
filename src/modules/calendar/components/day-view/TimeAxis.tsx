"use client";

import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  HOUR_HEIGHT,
  STAFF_HEADER_HEIGHT,
} from "../../lib/constants";

type TimeAxisProps = {
  startHour?: number;
  endHour?: number;
};

export function TimeAxis({
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
}: TimeAxisProps) {
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  return (
    <div className="relative w-16 shrink-0 border-r">
      {/* Spacer matching the sticky staff header so the first label isn't clipped */}
      <div style={{ height: STAFF_HEADER_HEIGHT }} className="border-b" />
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
