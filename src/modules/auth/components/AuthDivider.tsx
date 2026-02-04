"use client";

import { cn } from "@/lib/utils";

interface AuthDividerProps {
  text?: string;
  className?: string;
}

export function AuthDivider({ text = "OR", className }: AuthDividerProps) {
  return (
    <div className={cn("relative flex items-center gap-4", className)}>
      <div className="flex-1 h-px bg-foreground/30" />
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-2">
        {text}
      </span>
      <div className="flex-1 h-px bg-foreground/30" />
    </div>
  );
}
