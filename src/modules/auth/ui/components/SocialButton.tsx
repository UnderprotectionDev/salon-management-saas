"use client";

import { SiGoogle } from "@icons-pack/react-simple-icons";
import { cn } from "@/lib/utils";

interface SocialButtonProps {
  onClick: () => void;
  className?: string;
}

export function SocialButton({ onClick, className }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full h-12 flex items-center justify-center gap-3 text-sm border border-black/20 rounded-lg hover:bg-black/5 transition-all duration-200",
        className,
      )}
    >
      <SiGoogle className="size-4" />
      <span>Continue with Google</span>
    </button>
  );
}
