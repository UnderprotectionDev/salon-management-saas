import { Skeleton } from "@/components/ui/skeleton";

export function CareScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-lg">My Care Schedule</h3>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
