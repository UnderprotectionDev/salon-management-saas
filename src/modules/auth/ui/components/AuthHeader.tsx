import { cn } from "@/lib/utils";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showDivider?: boolean;
  className?: string;
}

export function AuthHeader({
  title,
  subtitle,
  showDivider = false,
  className,
}: AuthHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className="font-serif text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-black/60">{subtitle}</p>}
      {showDivider && <div className="mt-4 h-px bg-black/20" />}
    </div>
  );
}
