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
