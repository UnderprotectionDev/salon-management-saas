"use client";

import { useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { NotificationPanel } from "./NotificationPanel";

export function NotificationBell() {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?._id;

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    orgId ? { organizationId: orgId } : "skip",
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="end" sideOffset={8}>
        <NotificationPanel />
      </PopoverContent>
    </Popover>
  );
}
