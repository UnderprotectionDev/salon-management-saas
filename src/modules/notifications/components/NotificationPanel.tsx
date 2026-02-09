"use client";

import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { NotificationItem } from "./NotificationItem";

export function NotificationPanel() {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?._id;

  const notifications = useQuery(
    api.notifications.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteAll = useMutation(api.notifications.deleteAll);

  async function handleMarkAllRead() {
    if (!orgId) return;
    await markAllAsRead({ organizationId: orgId });
  }

  async function handleDeleteAll() {
    if (!orgId) return;
    await deleteAll({ organizationId: orgId });
    toast.success("All notifications deleted");
  }

  async function handleItemClick(notificationId: string) {
    if (!orgId) return;
    await markAsRead({
      organizationId: orgId,
      notificationId: notificationId as any,
    });
  }

  const hasUnread = notifications?.some((n) => !n.isRead);
  const hasNotifications = notifications && notifications.length > 0;

  return (
    <div className="w-80">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
          {hasNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 text-destructive hover:text-destructive"
              onClick={handleDeleteAll}
            >
              <Trash2 className="mr-1 size-3" />
              Delete all
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="max-h-[400px]">
        {notifications === undefined ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onClick={() => handleItemClick(n._id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
