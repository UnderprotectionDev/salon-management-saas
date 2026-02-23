import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/status-colors";

export function AppointmentStatusBadge({ status }: { status: string }) {
  const s = status as AppointmentStatus;
  const label = APPOINTMENT_STATUS_LABELS[s] ?? status;
  const classes = APPOINTMENT_STATUS_BADGE_CLASSES[s];

  if (!classes) {
    return <Badge variant="outline">{label}</Badge>;
  }

  return (
    <Badge variant="secondary" className={classes}>
      {label}
    </Badge>
  );
}
