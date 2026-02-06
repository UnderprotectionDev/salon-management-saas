"use client";

import { useMutation, useQuery } from "convex/react";
import { Calendar, Clock, Trash2 } from "lucide-react";
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

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-800",
  sick: "bg-red-100 text-red-800",
  personal: "bg-amber-100 text-amber-800",
  other: "bg-gray-100 text-gray-800",
};

const TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick Leave",
  personal: "Personal",
  other: "Other",
};

export function TimeOffRequestList() {
  const activeOrganization = useActiveOrganization();
  const requests = useQuery(
    api.timeOffRequests.getMyRequests,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const cancelRequest = useMutation(api.timeOffRequests.cancel);

  async function handleCancel(requestId: Id<"timeOffRequests">) {
    if (!activeOrganization) return;
    try {
      await cancelRequest({
        organizationId: activeOrganization._id,
        requestId,
      });
      toast.success("Request cancelled");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel request. Please try again.";
      toast.error(message);
    }
  }

  if (!activeOrganization) return null;

  // Loading state
  if (requests === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Time-Off Requests</CardTitle>
          <CardDescription>Your submitted time-off requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Time-Off Requests</CardTitle>
          <CardDescription>Your submitted time-off requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">No time-off requests</p>
            <p className="text-sm text-muted-foreground">
              You haven't submitted any time-off requests yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Time-Off Requests</CardTitle>
        <CardDescription>Your submitted time-off requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request._id}
              className="flex items-start justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                {/* Date range */}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="size-4 text-muted-foreground" />
                  {formatDate(request.startDate)} &mdash;{" "}
                  {formatDate(request.endDate)}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={TYPE_BADGE_STYLES[request.type]}
                  >
                    {TYPE_LABELS[request.type]}
                  </Badge>

                  {request.status === "pending" && (
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800"
                    >
                      Pending
                    </Badge>
                  )}
                  {request.status === "approved" && (
                    <Badge variant="default">Approved</Badge>
                  )}
                  {request.status === "rejected" && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                  {request.status === "cancelled" && (
                    <Badge variant="secondary">Cancelled</Badge>
                  )}
                </div>

                {/* Reason */}
                {request.reason && (
                  <p className="text-sm text-muted-foreground">
                    {request.reason}
                  </p>
                )}

                {/* Rejection reason */}
                {request.status === "rejected" && request.rejectionReason && (
                  <p className="text-sm text-red-600">
                    Rejection reason: {request.rejectionReason}
                  </p>
                )}
              </div>

              {/* Cancel button for pending and approved requests */}
              {(request.status === "pending" ||
                request.status === "approved") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleCancel(request._id)}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Cancel request</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
