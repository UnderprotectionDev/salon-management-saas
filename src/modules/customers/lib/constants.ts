export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  guest: "Guest",
  recognized: "Recognized",
  prompted: "Prompted",
  registered: "Registered",
};

export const ACCOUNT_STATUSES = [
  "guest",
  "recognized",
  "prompted",
  "registered",
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  staff: "Staff",
  import: "Import",
};

export const SOURCES = [
  "online",
  "walk_in",
  "phone",
  "staff",
  "import",
] as const;

export const LAST_VISIT_OPTIONS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "90+ days ago", days: -90 },
] as const;
