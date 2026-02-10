"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  color: string;
}[] = [
  { key: "pending", label: "Pending", color: "bg-amber-400" },
  { key: "confirmed", label: "Confirmed", color: "bg-blue-500" },
  { key: "inProgress", label: "In Progress", color: "bg-indigo-500" },
  { key: "completed", label: "Completed", color: "bg-green-500" },
  { key: "cancelled", label: "Cancelled", color: "bg-gray-400" },
  { key: "noShow", label: "No-show", color: "bg-red-500" },
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
                <div className={`size-2.5 rounded-full ${seg.color}`} />
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
                    className={`${seg.color} transition-all`}
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
