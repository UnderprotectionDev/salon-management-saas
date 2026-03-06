import { Skeleton } from "@/components/ui/skeleton";

export function TryOnDesignSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {["a", "b", "c", "d", "e", "f", "g", "h"].map((key) => (
        <Skeleton
          key={`design-skeleton-${key}`}
          className="aspect-square rounded-md"
        />
      ))}
    </div>
  );
}
