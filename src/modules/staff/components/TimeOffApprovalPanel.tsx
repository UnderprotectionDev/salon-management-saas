"use client";

import { useMutation, useQuery } from "convex/react";
import { Calendar, Check, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

export function TimeOffApprovalPanel() {
  const activeOrganization = useActiveOrganization();

  const pendingRequests = useQuery(
    api.timeOffRequests.listByOrg,
    activeOrganization
      ? { organizationId: activeOrganization._id, status: "pending" }
      : "skip",
  );

  const approveRequest = useMutation(api.timeOffRequests.approve);
  const rejectRequest = useMutation(api.timeOffRequests.reject);

  const [rejectingId, setRejectingId] = useState<Id<"timeOffRequests"> | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleApprove(requestId: Id<"timeOffRequests">) {
    if (!activeOrganization) return;
    setIsSubmitting(true);
    try {
      await approveRequest({
        organizationId: activeOrganization._id,
        requestId,
      });
      toast.success("Request approved");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to approve request. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!activeOrganization || !rejectingId) return;
    setIsSubmitting(true);
    try {
      await rejectRequest({
        organizationId: activeOrganization._id,
        requestId: rejectingId,
        rejectionReason: rejectionReason || undefined,
      });
      toast.success("Request rejected");
      setRejectingId(null);
      setRejectionReason("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to reject request. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeOrganization) return null;

  // Loading state
  if (pendingRequests === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Time-Off Requests</CardTitle>
          <CardDescription>
            Review and approve or reject staff time-off requests.
          </CardDescription>
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
  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Time-Off Requests</CardTitle>
          <CardDescription>
            Review and approve or reject staff time-off requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">No pending requests</p>
            <p className="text-sm text-muted-foreground">
              All time-off requests have been reviewed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Time-Off Requests</CardTitle>
          <CardDescription>
            Review and approve or reject staff time-off requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request._id}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  {/* Staff name */}
                  <p className="text-sm font-semibold">{request.staffName}</p>

                  {/* Date range */}
                  <p className="text-sm text-muted-foreground">
                    {formatDate(request.startDate)} &mdash;{" "}
                    {formatDate(request.endDate)}
                  </p>

                  {/* Type badge */}
                  <Badge
                    variant="outline"
                    className={
                      TYPE_BADGE_STYLES[request.type] ??
                      "bg-gray-100 text-gray-800"
                    }
                  >
                    {TYPE_LABELS[request.type] ?? request.type}
                  </Badge>

                  {/* Reason */}
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">
                      {request.reason}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-green-600 hover:bg-green-50 hover:text-green-700"
                    disabled={isSubmitting}
                    onClick={() => handleApprove(request._id)}
                  >
                    <Check className="size-4" />
                    <span className="sr-only">Approve</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={isSubmitting}
                    onClick={() => {
                      setRejectingId(request._id);
                      setRejectionReason("");
                    }}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Reject</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectingId !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setRejectingId(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Time-Off Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            rows={3}
            disabled={isSubmitting}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingId(null);
                setRejectionReason("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
