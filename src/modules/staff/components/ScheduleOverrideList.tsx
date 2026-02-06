"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarOff, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ScheduleOverrideListProps = {
  staffId: Id<"staff">;
  canEdit: boolean;
};

const TYPE_CONFIG = {
  custom_hours: { label: "Custom Hours", variant: "default" as const },
  day_off: { label: "Day Off", variant: "destructive" as const },
  time_off: { label: "Time Off", variant: "secondary" as const },
};

const DEFAULT_CONFIG = { label: "Unknown", variant: "outline" as const };

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ScheduleOverrideList({
  staffId,
  canEdit,
}: ScheduleOverrideListProps) {
  const activeOrganization = useActiveOrganization();
  const overrides = useQuery(
    api.scheduleOverrides.listByStaff,
    activeOrganization
      ? { organizationId: activeOrganization._id, staffId }
      : "skip",
  );
  const removeOverride = useMutation(api.scheduleOverrides.remove);

  const handleDelete = async (overrideId: Id<"scheduleOverrides">) => {
    if (!activeOrganization) return;
    try {
      await removeOverride({
        organizationId: activeOrganization._id,
        overrideId,
      });
      toast.success("Schedule override removed");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove override. Please try again.";
      toast.error(message);
    }
  };

  // Loading state
  if (overrides === undefined) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Overrides</CardTitle>
        <CardDescription>
          One-time changes to the regular schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overrides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarOff className="size-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No schedule overrides
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add overrides for days off, custom hours, or time off
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {overrides.map((override) => {
              const config =
                TYPE_CONFIG[override.type as keyof typeof TYPE_CONFIG] ??
                DEFAULT_CONFIG;
              return (
                <div
                  key={override._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDate(override.date)}
                      </span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    {override.type === "custom_hours" &&
                      override.startTime &&
                      override.endTime && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>
                            {override.startTime} - {override.endTime}
                          </span>
                        </div>
                      )}
                    {override.reason && (
                      <p className="text-xs text-muted-foreground">
                        {override.reason}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(override._id)}
                      aria-label="Remove override"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
