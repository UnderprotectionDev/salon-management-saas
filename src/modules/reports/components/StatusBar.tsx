"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APPOINTMENT_STATUS_BAR_COLORS } from "@/lib/status-colors";

type StatusBreakdown = {
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

const segments: {
  key: keyof StatusBreakdown;
  label: string;
  statusKey: keyof typeof APPOINTMENT_STATUS_BAR_COLORS;
}[] = [
  { key: "pending", label: "Pending", statusKey: "pending" },
  { key: "confirmed", label: "Confirmed", statusKey: "confirmed" },
  { key: "inProgress", label: "In Progress", statusKey: "in_progress" },
  { key: "completed", label: "Completed", statusKey: "completed" },
  { key: "cancelled", label: "Cancelled", statusKey: "cancelled" },
  { key: "noShow", label: "No-show", statusKey: "no_show" },
];

export function StatusBar({ data }: { data: StatusBreakdown }) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);

  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {segments.map(
          (seg) =>
            data[seg.key] > 0 && (
              <div key={seg.key} className="flex items-center gap-1.5">
                <div
                  className={`size-2.5 rounded-full ${APPOINTMENT_STATUS_BAR_COLORS[seg.statusKey]}`}
                />
                <span>
                  {seg.label}: {data[seg.key]}
                </span>
              </div>
            ),
        )}
      </div>
      <TooltipProvider>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((seg) => {
            const count = data[seg.key];
            if (count === 0) return null;
            const pct = (count / total) * 100;
            return (
              <Tooltip key={seg.key}>
                <TooltipTrigger asChild>
                  <div
                    className={`${APPOINTMENT_STATUS_BAR_COLORS[seg.statusKey]} transition-all`}
                    style={{ width: `${pct}%` }}
                    tabIndex={0}
                    role="meter"
                    aria-label={`${seg.label}: ${count} (${Math.round(pct)}%)`}
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={total}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {seg.label}: {count} ({Math.round(pct)}%)
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
