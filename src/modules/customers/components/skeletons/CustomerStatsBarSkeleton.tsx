import { Skeleton } from "@/components/ui/skeleton";

export function CustomerStatsBarSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
      <Skeleton className="h-4 w-64" />
    </div>
  );
}
