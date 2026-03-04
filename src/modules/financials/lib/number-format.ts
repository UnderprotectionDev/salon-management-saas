export type NumberFormat =
  | "general"
  | "currency"
  | "percent"
  | "comma"
  | "decimal2"
  | "date"
  | "time"
  | "datetime"
  | "custom";

export const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: "general", label: "General" },
  { value: "currency", label: "Currency (₺)" },
  { value: "percent", label: "Percent (%)" },
  { value: "comma", label: "Comma (1.234)" },
  { value: "decimal2", label: "Decimal (1.234,56)" },
  { value: "date", label: "Date (DD.MM.YYYY)" },
  { value: "time", label: "Time (14:30)" },
  { value: "datetime", label: "Date & Time" },
  { value: "custom", label: "Custom" },
];

/**
 * Try to parse a value as a date.
 * Supports ISO strings (2026-03-01), Turkish format (01.03.2026),
 * and Excel-like serial numbers (>30000).
 */
function tryParseDate(value: string): Date | null {
  // ISO format: 2026-03-01 or 2026-03-01T14:30:00
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Turkish format: 01.03.2026
  const trMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (trMatch) {
    const d = new Date(
      Number(trMatch[3]),
      Number(trMatch[2]) - 1,
      Number(trMatch[1]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Excel serial number (days since 1900-01-01, roughly)
  const num = Number.parseFloat(value);
  if (!Number.isNaN(num) && num > 30000 && num < 100000) {
    // Excel epoch: 1899-12-30
    const d = new Date(1899, 11, 30);
    d.setDate(d.getDate() + Math.floor(num));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function formatCellDisplay(value: string, format: NumberFormat): string {
  if (!value || format === "general") return value;

  // Date/time formats
  if (format === "date" || format === "time" || format === "datetime") {
    const d = tryParseDate(value);
    if (!d) return value;

    switch (format) {
      case "date":
        return d.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      case "time":
        return d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      case "datetime":
        return `${d.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })} ${d.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`;
    }
  }

  // Custom format: return as-is (user manages their own formatting)
  if (format === "custom") return value;

  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return value;

  switch (format) {
    case "currency":
      return `₺${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "percent":
      return `${(num * 100).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    case "comma":
      return num.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
    case "decimal2":
      return num.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    default:
      return value;
  }
}
