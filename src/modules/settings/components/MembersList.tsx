"use client";

import { useMutation, useQuery } from "convex/react";
import {
  LogOut,
  MoreHorizontal,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";

type MembersListProps = {
  organizationId: Id<"organization">;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    default:
      return "outline";
  }
}

export function MembersList({ organizationId }: MembersListProps) {
  const { activeOrganization, currentRole } = useOrganization();
  const router = useRouter();

  const members = useQuery(api.members.list, { organizationId });
  const staffList = useQuery(api.staff.list, { organizationId });

  const removeMember = useMutation(api.members.remove);
  const leaveOrg = useMutation(api.members.leave);

  const [removeTarget, setRemoveTarget] = useState<Id<"member"> | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  if (members === undefined || staffList === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  // Build a lookup from memberId to staff info
  const staffByMemberId = new Map(staffList.map((s) => [s.memberId, s]));

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeMember({ memberId: removeTarget });
      toast.success("Member removed");
      setRemoveTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error(message);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveOrg({ organizationId });
      toast.success("You have left the organization");
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to leave organization";
      toast.error(message);
    }
  };

  const isOwner = currentRole === "owner";
  const isAdminOrOwner = currentRole === "owner";

  // Build member list with staff info for TransferOwnershipDialog
  const membersWithNames = members.map((m) => {
    const staff = staffByMemberId.get(m._id);
    return {
      ...m,
      name: staff?.name,
      email: staff?.email,
    };
  });

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Joined</TableHead>
            {isAdminOrOwner && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const staff = staffByMemberId.get(member._id);
            const name = staff?.name ?? member.userId;
            const email = staff?.email;
            const isSelf = member._id === activeOrganization?.memberId;

            return (
              <TableRow key={member._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {new Date(member.createdAt).toLocaleDateString()}
                </TableCell>
                {isAdminOrOwner && (
                  <TableCell>
                    {member.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isSelf && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRemoveTarget(member._id)}
                            >
                              <ShieldAlert className="mr-2 size-4" />
                              Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Leave Organization (non-owner) */}
      {!isOwner && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setShowLeaveDialog(true)}
          >
            <LogOut className="mr-2 size-4" />
            Leave Organization
          </Button>
        </div>
      )}

      {/* Transfer Ownership (owner only) */}
      {isOwner && (
        <div className="pt-4 border-t">
          <TransferOwnershipDialog
            organizationId={organizationId}
            members={membersWithNames}
          />
        </div>
      )}

      {/* Remove Member AlertDialog */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? Their staff profile
              will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Organization AlertDialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Leave {activeOrganization?.name ?? "this organization"}? You will
              lose access and your staff profile will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
