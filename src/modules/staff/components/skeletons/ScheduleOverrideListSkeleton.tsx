import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScheduleOverrideListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Overrides</CardTitle>
        <CardDescription>
          One-time changes to the regular schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}
