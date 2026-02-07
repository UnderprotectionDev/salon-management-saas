"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";

type SlotLockCountdownProps = {
  expiresAt: number;
  onExpired: () => void;
};

export function SlotLockCountdown({
  expiresAt,
  onExpired,
}: SlotLockCountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000),
      );
      setRemaining(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(interval);
        toast.error("Slot reservation expired. Please select a time again.");
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining <= 30;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${
        isWarning
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <Clock className="size-3.5" />
      <span>
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
