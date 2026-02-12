import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFooterProps {
  className?: string;
}

export function AuthFooter({ className }: AuthFooterProps) {
  return (
    <footer className={cn("space-y-4 text-xs", className)}>
      <div className="h-px bg-black/20" />
      <div className="flex justify-between items-center text-black/50">
        <span className="flex items-center gap-1.5">
          <LockIcon className="size-3" />
          Protected by industry-standard encryption
        </span>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-black transition-colors">
            Privacy
          </a>
          <a href="/terms" className="hover:text-black transition-colors">
            Terms
          </a>
        </div>
      </div>
      <div className="flex justify-between items-center text-black/50">
        <span>&copy; 2026 Salon Management</span>
        <div className="flex gap-2">
          <button type="button" className="hover:text-black transition-colors">
            Türkçe
          </button>
          <span>/</span>
          <button type="button" className="hover:text-black transition-colors">
            English
          </button>
        </div>
      </div>
    </footer>
  );
}
