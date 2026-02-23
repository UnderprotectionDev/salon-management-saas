import { Check } from "lucide-react";

export function SectionDivider({
  title,
  badge,
  complete,
}: {
  title: string;
  badge?: "REQUIRED" | "OPTIONAL";
  complete?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex items-center gap-2 shrink-0">
        <h2 className="text-[11px] font-bold tracking-[0.2em] text-foreground/80 uppercase">
          {title}
        </h2>
        {complete && (
          <Check className="size-3.5 text-green-600 animate-[scale-in_0.2s_ease-out]" />
        )}
      </div>
      <div className="flex-1 h-px bg-border" />
      {badge && (
        <span
          className={`text-[9px] font-bold tracking-[0.15em] uppercase shrink-0 px-2 py-0.5 ${
            badge === "REQUIRED"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
