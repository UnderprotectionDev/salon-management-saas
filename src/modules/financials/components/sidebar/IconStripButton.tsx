import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconStripButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

export function IconStripButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
}: IconStripButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "relative w-8 h-8 flex items-center justify-center rounded-md transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="size-3.5" />
      {badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-bold px-0.5">
          {badge}
        </span>
      )}
    </button>
  );
}
