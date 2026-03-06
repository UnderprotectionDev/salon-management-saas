import { Skeleton } from "@/components/ui/skeleton";

export function DesignBrowserSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <Skeleton key={k} className="aspect-square rounded-md" />
        ))}
      </div>
    </div>
  );
}
