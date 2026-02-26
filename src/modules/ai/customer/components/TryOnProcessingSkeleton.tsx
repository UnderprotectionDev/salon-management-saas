import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TryOnProcessingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-medium text-sm">Processing your try-on…</p>
          <p className="text-muted-foreground text-xs">
            Usually takes 15–30 seconds
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="mx-auto h-3 w-12" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="mx-auto h-3 w-12" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
