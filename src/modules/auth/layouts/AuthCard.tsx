import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <Card
      className={cn(
        "w-full max-w-md px-8 py-10 border-salon-rose-gold-light/50 bg-white/80 backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500",
        className,
      )}
    >
      {children}
    </Card>
  );
}
