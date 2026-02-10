export function downloadCsv(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
) {
  const BOM = "\uFEFF";
  const csvContent =
    BOM +
    [
      headers.map(escapeCsvField).join(","),
      ...rows.map((row) => row.map(escapeCsvField).join(",")),
    ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Sanitize user-controlled values to prevent CSV injection in spreadsheet apps. */
export function sanitizeCsvValue(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function reportFilename(
  type: string,
  from: string,
  to: string,
): string {
  return `${type}_${from}_to_${to}.csv`;
}
