"use client";

import { useMutation, useQuery } from "convex/react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { OvertimeDialog } from "./OvertimeDialog";

type OvertimeManagerProps = {
  staffId: Id<"staff">;
  canEdit: boolean;
};

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OvertimeManager({ staffId, canEdit }: OvertimeManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const activeOrganization = useActiveOrganization();
  const overtime = useQuery(
    api.staffOvertime.listByStaff,
    activeOrganization
      ? { organizationId: activeOrganization._id, staffId }
      : "skip",
  );
  const removeOvertime = useMutation(api.staffOvertime.remove);

  const handleDelete = async (overtimeId: Id<"staffOvertime">) => {
    if (!activeOrganization) return;
    try {
      await removeOvertime({
        organizationId: activeOrganization._id,
        overtimeId,
      });
      toast.success("Overtime entry removed");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove overtime entry. Please try again.";
      toast.error(message);
    }
  };

  // Loading state
  if (overtime === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overtime</CardTitle>
          <CardDescription>
            Extra work hours beyond the regular schedule
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Overtime</CardTitle>
          <CardDescription>
            Extra work hours beyond the regular schedule
          </CardDescription>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 size-4" />
            Add Overtime
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {overtime.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="size-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No overtime entries
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add overtime for extra work hours outside the regular schedule
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {overtime.map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatDate(entry.date)}
                    </span>
                    <Badge variant="outline">Overtime</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>
                      {entry.startTime} - {entry.endTime}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground">
                      {entry.reason}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry._id)}
                    aria-label="Remove overtime entry"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <OvertimeDialog
        staffId={staffId}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </Card>
  );
}
