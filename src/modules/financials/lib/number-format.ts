export type NumberFormat =
  | "general"
  | "currency"
  | "percent"
  | "comma"
  | "decimal2";

export const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: "general", label: "General" },
  { value: "currency", label: "Currency (₺)" },
  { value: "percent", label: "Percent (%)" },
  { value: "comma", label: "Comma (1.234)" },
  { value: "decimal2", label: "Decimal (1.234,56)" },
];

export function formatCellDisplay(value: string, format: NumberFormat): string {
  if (!value || format === "general") return value;

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
