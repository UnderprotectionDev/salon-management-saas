"use client";

import { CalendarRange, Columns3, Grid2x2, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CalendarViewMode } from "../../hooks/useCalendarState";

type ViewToggleProps = {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
};

const VIEW_OPTIONS: {
  mode: CalendarViewMode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { mode: "day", icon: List, label: "Day" },
  { mode: "week", icon: Columns3, label: "Week" },
  { mode: "month", icon: Grid2x2, label: "Month" },
  { mode: "year", icon: Grid3x3, label: "Year" },
  { mode: "agenda", icon: CalendarRange, label: "Agenda" },
];

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex">
      {VIEW_OPTIONS.map(({ mode, icon: Icon, label }, index) => {
        const isActive = viewMode === mode;
        const isFirst = index === 0;
        const isLast = index === VIEW_OPTIONS.length - 1;

        return (
          <Tooltip key={mode} delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? "default" : "outline"}
                size="icon"
                className={`${isFirst ? "rounded-r-none" : ""} ${isLast ? "rounded-l-none" : ""} ${!isFirst && !isLast ? "rounded-none" : ""} ${!isFirst ? "-ml-px" : ""} [&_svg]:size-4`}
                onClick={() => onViewModeChange(mode)}
                aria-label={`${label} view`}
                aria-pressed={isActive}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
