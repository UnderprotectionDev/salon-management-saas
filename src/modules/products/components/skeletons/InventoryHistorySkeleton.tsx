import { Skeleton } from "@/components/ui/skeleton";

export function InventoryHistorySkeleton() {
  return (
    <div className="space-y-6 py-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-[3.5rem_1fr_auto] gap-x-5">
          <Skeleton className="h-4 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
