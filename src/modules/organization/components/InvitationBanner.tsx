"use client";

import { useMutation, useQuery } from "convex/react";
import { Building2, Mail, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function getRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "member":
      return "Staff";
    default:
      return role;
  }
}

export function InvitationBanner() {
  const router = useRouter();
  const invitations = useQuery(api.invitations.getPendingForCurrentUser);
  const acceptMutation = useMutation(api.invitations.accept);
  const rejectMutation = useMutation(api.invitations.reject);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Still loading or no invitations
  if (!invitations || invitations.length === 0) {
    return null;
  }

  // Filter out dismissed invitations for optimistic UI
  const visibleInvitations = invitations.filter(
    (inv) => !dismissedIds.has(inv._id),
  );

  if (visibleInvitations.length === 0) {
    return null;
  }

  const handleAccept = async (invitationId: Id<"invitation">) => {
    setLoadingId(invitationId);
    try {
      const result = await acceptMutation({ invitationId });
      if (result.organizationSlug) {
        router.push(`/${result.organizationSlug}/dashboard`);
      }
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast.error("Failed to accept invitation. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (invitationId: Id<"invitation">) => {
    setLoadingId(invitationId);
    // Optimistic dismiss
    setDismissedIds((prev) => new Set(prev).add(invitationId));
    try {
      await rejectMutation({ invitationId });
    } catch (error) {
      console.error("Failed to reject invitation:", error);
      toast.error("Failed to decline invitation. Please try again.");
      // Revert optimistic update on error
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {visibleInvitations.map((invitation) => (
        <Alert key={invitation._id} className="bg-primary/5 border-primary/20">
          <Mail className="size-4 text-primary" />
          <AlertTitle className="flex items-center gap-2">
            Organization Invitation
            <Badge variant="secondary" className="text-xs">
              {getRoleLabel(invitation.role)}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  You've been invited to join
                </span>
                <span className="font-medium">
                  {invitation.organizationName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation._id)}
                  disabled={loadingId === invitation._id}
                >
                  {loadingId === invitation._id ? "Processing..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invitation._id)}
                  disabled={loadingId === invitation._id}
                >
                  <X className="size-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">
                    Decline
                  </span>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
