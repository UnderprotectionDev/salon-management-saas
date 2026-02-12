import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span
      className={cn("font-bold text-sm tracking-wider uppercase", className)}
    >
      SALON MANAGEMENT
    </span>
  );
}
