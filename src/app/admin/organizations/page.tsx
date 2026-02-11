"use client";

import { useMutation, useQuery } from "convex/react";
import { MoreHorizontal, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function formatCurrency(kurus: number): string {
  return `₺${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="secondary">No status</Badge>;
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    canceled: "destructive",
    suspended: "destructive",
    pending_payment: "outline",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
}

function SuspendOrgDialog({
  orgId,
  orgName,
  open,
  onOpenChange,
}: {
  orgId: Id<"organization">;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const suspendOrg = useMutation(api.admin.suspendOrganization);

  const handleSuspend = async () => {
    try {
      await suspendOrg({ organizationId: orgId, reason: reason || undefined });
      toast.success(`${orgName} has been suspended`);
      onOpenChange(false);
      setReason("");
    } catch (error) {
      toast.error("Failed to suspend organization");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Organization</DialogTitle>
          <DialogDescription>
            This will suspend <strong>{orgName}</strong>. Users will not be able
            to create appointments.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason for suspension (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSuspend}>
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteOrgDialog({
  orgId,
  orgSlug,
  orgName,
  open,
  onOpenChange,
}: {
  orgId: Id<"organization">;
  orgSlug: string;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmSlug, setConfirmSlug] = useState("");
  const deleteOrg = useMutation(api.admin.deleteOrganization);

  const handleDelete = async () => {
    try {
      await deleteOrg({ organizationId: orgId, confirmSlug });
      toast.success(`${orgName} has been deleted`);
      onOpenChange(false);
      setConfirmSlug("");
    } catch (error) {
      toast.error("Failed to delete organization. Check the slug.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Organization</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{orgName}</strong> and all its
            data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Type <strong>{orgSlug}</strong> to confirm:
          </p>
          <Input
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={orgSlug}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmSlug !== orgSlug}
          >
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [suspendTarget, setSuspendTarget] = useState<{
    id: Id<"organization">;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"organization">;
    name: string;
    slug: string;
  } | null>(null);

  const unsuspendOrg = useMutation(api.admin.unsuspendOrganization);

  const organizations = useQuery(api.admin.listAllOrganizations, {
    search: search || undefined,
    statusFilter: statusFilter === "all" ? undefined : statusFilter,
  });

  const handleUnsuspend = async (
    orgId: Id<"organization">,
    orgName: string,
  ) => {
    try {
      await unsuspendOrg({ organizationId: orgId });
      toast.success(`${orgName} has been unsuspended`);
    } catch (error) {
      toast.error("Failed to unsuspend organization");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organizations</h1>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, slug, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!organizations ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Customers</TableHead>
                <TableHead className="text-center">Appointments</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-muted-foreground">
                          /{org.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {org.ownerName ?? "—"}
                        {org.ownerEmail && (
                          <div className="text-xs text-muted-foreground">
                            {org.ownerEmail}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {org.memberCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {org.customerCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {org.appointmentCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(org.revenue)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={org.subscriptionStatus} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={`/${org.slug}/dashboard`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Dashboard
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {org.subscriptionStatus === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() => handleUnsuspend(org._id, org.name)}
                            >
                              Unsuspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setSuspendTarget({
                                  id: org._id,
                                  name: org.name,
                                })
                              }
                              className="text-destructive"
                            >
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteTarget({
                                id: org._id,
                                name: org.name,
                                slug: org.slug,
                              })
                            }
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {suspendTarget && (
        <SuspendOrgDialog
          orgId={suspendTarget.id}
          orgName={suspendTarget.name}
          open={!!suspendTarget}
          onOpenChange={(open) => !open && setSuspendTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteOrgDialog
          orgId={deleteTarget.id}
          orgSlug={deleteTarget.slug}
          orgName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
