import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TBtnProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function TBtn({
  icon,
  label,
  shortcut,
  onClick,
  active,
  disabled,
}: TBtnProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded text-foreground",
              active && "bg-accent text-accent-foreground",
            )}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <span>{label}</span>
          {shortcut && (
            <kbd className="ml-1.5 px-1 py-0.5 text-[10px] font-mono bg-muted/50 border border-border/50 rounded">
              {shortcut}
            </kbd>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-none select-none">
      {children}
    </span>
  );
}
