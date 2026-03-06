import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlanCardSkeleton() {
  return (
    <Card className="opacity-50">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24 mt-2" />
      </CardHeader>
    </Card>
  );
}
