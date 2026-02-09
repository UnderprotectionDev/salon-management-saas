"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CalendarCheck,
  CalendarMinus,
  CalendarSync,
  Clock,
  UserX,
} from "lucide-react";
import type { Doc } from "../../../../convex/_generated/dataModel";

type NotificationItemProps = {
  notification: Doc<"notifications">;
  onClick: () => void;
};

const typeIcons: Record<string, React.ReactNode> = {
  new_booking: <CalendarCheck className="size-4 text-green-600" />,
  cancellation: <CalendarMinus className="size-4 text-red-600" />,
  reschedule: <CalendarSync className="size-4 text-blue-600" />,
  reminder_30min: <Clock className="size-4 text-orange-600" />,
  no_show: <UserX className="size-4 text-red-600" />,
  status_change: <Bell className="size-4 text-gray-600" />,
};

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const icon = typeIcons[notification.type] ?? <Bell className="size-4" />;
  const isUnread = !notification.isRead;

  return (
    <button
      type="button"
      className={`flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted ${isUnread ? "bg-blue-50/50" : ""}`}
      onClick={onClick}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}
          >
            {notification.title}
          </span>
          {isUnread && (
            <div className="size-2 shrink-0 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </button>
  );
}
