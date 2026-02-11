"use client";

import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../../../convex/_generated/api";

function ActionBadge({ action }: { action: string }) {
  const variants: Record<
    string,
    "default" | "destructive" | "secondary" | "outline"
  > = {
    suspend_org: "destructive",
    unsuspend_org: "default",
    delete_org: "destructive",
    ban_user: "destructive",
    unban_user: "default",
    update_subscription: "secondary",
  };

  const labels: Record<string, string> = {
    suspend_org: "Suspend Org",
    unsuspend_org: "Unsuspend Org",
    delete_org: "Delete Org",
    ban_user: "Ban User",
    unban_user: "Unban User",
    update_subscription: "Update Sub",
  };

  return (
    <Badge variant={variants[action] ?? "outline"}>
      {labels[action] ?? action}
    </Badge>
  );
}

export default function AdminLogsPage() {
  const actions = useQuery(api.admin.getActionLog, { limit: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Action Log</h1>

      {!actions ? (
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
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No actions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                actions.map((action) => (
                  <TableRow key={action._id}>
                    <TableCell className="font-medium">
                      {action.adminEmail}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={action.action} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <Badge variant="outline" className="mr-1">
                          {action.targetType}
                        </Badge>
                        <span className="text-muted-foreground font-mono text-xs">
                          {action.targetId.slice(0, 16)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {action.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(action.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
