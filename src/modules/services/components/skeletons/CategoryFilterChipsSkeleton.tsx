import { Skeleton } from "@/components/ui/skeleton";

export function CategoryFilterChipsSkeleton() {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  );
}
