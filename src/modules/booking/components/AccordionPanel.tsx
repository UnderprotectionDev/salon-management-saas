"use client";

import { Check, ChevronDown, Pencil } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type PanelState = "idle" | "active" | "completed";

type AccordionPanelProps = {
  stepNumber: number;
  title: string;
  state: PanelState;
  summary?: React.ReactNode;
  onToggle: () => void;
  children: React.ReactNode;
};

export function AccordionPanel({
  stepNumber,
  title,
  state,
  summary,
  onToggle,
  children,
}: AccordionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll into view when panel becomes active
  useEffect(() => {
    if (state === "active" && panelRef.current) {
      // Small delay to let the animation start
      const timer = setTimeout(() => {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const isOpen = state === "active";
  const isDisabled = state === "idle";

  return (
    <div ref={panelRef}>
      <Collapsible open={isOpen}>
        <CollapsibleTrigger
          onClick={isDisabled ? undefined : onToggle}
          disabled={isDisabled}
          className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
            isOpen
              ? "border-primary bg-primary/5"
              : state === "completed"
                ? "border-border bg-background hover:bg-accent/50 cursor-pointer"
                : "border-border bg-muted/30 cursor-not-allowed opacity-50"
          }`}
        >
          {/* Step number badge */}
          <div
            className={`flex items-center justify-center size-8 rounded-full text-xs font-medium shrink-0 ${
              state === "completed"
                ? "bg-primary text-primary-foreground"
                : isOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {state === "completed" ? <Check className="size-4" /> : stepNumber}
          </div>

          {/* Title and summary */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{title}</div>
            {state === "completed" && summary && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {summary}
              </div>
            )}
          </div>

          {/* Action icon */}
          {state === "completed" && (
            <Pencil className="size-4 text-muted-foreground shrink-0" />
          )}
          {isOpen && (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="border border-t-0 rounded-b-lg p-4 bg-background">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
