import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: {
    label: "Confirmed",
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600",
  },
  checked_in: { label: "Checked In", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: {
    label: "Completed",
    variant: "default",
    className: "bg-green-600 hover:bg-green-700",
  },
  cancelled: { label: "Cancelled", variant: "destructive" },
  no_show: { label: "No Show", variant: "destructive" },
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    variant: "outline" as const,
  };

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
