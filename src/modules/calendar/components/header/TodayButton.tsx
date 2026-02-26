"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";

type TodayButtonProps = {
  onToday: () => void;
};

export function TodayButton({ onToday }: TodayButtonProps) {
  const now = new Date();
  const month = format(now, "MMM").toUpperCase();
  const day = format(now, "d");

  return (
    <Button
      variant="outline"
      className="flex size-14 flex-col items-center justify-center gap-0 rounded-lg p-0"
      onClick={onToday}
      aria-label={`Go to today, ${month} ${day}`}
    >
      <span className="flex h-5 w-full items-center justify-center rounded-t-md bg-primary text-[10px] font-bold tracking-wider text-primary-foreground">
        {month}
      </span>
      <span className="text-lg font-bold leading-none">{day}</span>
    </Button>
  );
}
