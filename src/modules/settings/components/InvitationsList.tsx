"use client";

import { useMutation, useQuery } from "convex/react";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrganization } from "@/modules/organization";
import { AddStaffDialog } from "@/modules/staff";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type InvitationsListProps = {
  organizationId: Id<"organization">;
};

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "accepted":
      return "default";
    case "pending":
      return "secondary";
    case "expired":
      return "outline";
    case "cancelled":
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "secondary";
    default:
      return "outline";
  }
}

export function InvitationsList({ organizationId }: InvitationsListProps) {
  const { currentRole } = useOrganization();
  const invitations = useQuery(api.invitations.list, { organizationId });
  const cancelInvitation = useMutation(api.invitations.cancel);
  const resendInvitation = useMutation(api.invitations.resend);

  const [cancelTarget, setCancelTarget] = useState<Id<"invitation"> | null>(
    null,
  );

  if (invitations === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";

  const handleResend = async (invitationId: Id<"invitation">) => {
    try {
      await resendInvitation({ invitationId });
      toast.success("Invitation resent");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to resend invitation";
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelInvitation({ invitationId: cancelTarget });
      toast.success("Invitation cancelled");
      setCancelTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel invitation";
      toast.error(message);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="mb-4 text-sm text-muted-foreground">No invitations yet</p>
        {isAdminOrOwner && <AddStaffDialog organizationId={organizationId} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name / Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Sent</TableHead>
            {isAdminOrOwner && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation._id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {invitation.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {invitation.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(invitation.role)}>
                  {invitation.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(invitation.status)}>
                  {invitation.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {new Date(invitation.createdAt).toLocaleDateString()}
              </TableCell>
              {isAdminOrOwner && (
                <TableCell>
                  {invitation.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleResend(invitation._id)}
                        title="Resend invitation"
                      >
                        <RefreshCw className="size-4" />
                        <span className="sr-only">Resend</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => setCancelTarget(invitation._id)}
                        title="Cancel invitation"
                      >
                        <X className="size-4" />
                        <span className="sr-only">Cancel</span>
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Cancel Invitation AlertDialog */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The recipient
              will no longer be able to join using this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
