import { Skeleton } from "@/components/ui/skeleton";

export function StaffAssignmentSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
