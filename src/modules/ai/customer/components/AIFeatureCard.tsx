"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type AccentColor = "violet" | "amber" | "rose" | "emerald";

const ACCENT_STYLES: Record<AccentColor, { bg: string; text: string }> = {
  violet: { bg: "bg-violet-100 dark:bg-violet-950", text: "text-violet-600 dark:text-violet-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-600 dark:text-amber-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-950", text: "text-rose-600 dark:text-rose-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400" },
};

interface AIFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  active?: boolean;
  disabled?: boolean;
  accentColor?: AccentColor;
  onClick: () => void;
}

export function AIFeatureCard({
  icon: Icon,
  title,
  description,
  active,
  disabled,
  accentColor,
  onClick,
}: AIFeatureCardProps) {
  const accent = accentColor ? ACCENT_STYLES[accentColor] : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className="w-full text-left"
    >
      <Card
        className={`transition-all ${
          active
            ? "border-primary ring-2 ring-primary/20"
            : disabled
              ? "opacity-50"
              : "hover:border-muted-foreground/30 hover:shadow-sm"
        }`}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent ? accent.bg : "bg-primary/10"}`}
          >
            <Icon
              className={`size-4 ${accent ? accent.text : "text-primary"}`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-muted-foreground text-xs">
              {disabled ? "Not available for this salon type" : description}
            </p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
