/**
 * Parse a cell reference like "A1" into {row, col} (0-indexed)
 */
export function parseRef(ref: string): { row: number; col: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return { row: Number.parseInt(m[2], 10) - 1, col: col - 1 };
}

/**
 * Expand a range like "A1:B3" into an array of cell refs
 */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(":");
  if (parts.length !== 2) return [];
  const start = parseRef(parts[0]);
  const end = parseRef(parts[1]);
  if (!start || !end) return [];
  const refs: string[] = [];
  for (
    let r = Math.min(start.row, end.row);
    r <= Math.max(start.row, end.row);
    r++
  ) {
    for (
      let c = Math.min(start.col, end.col);
      c <= Math.max(start.col, end.col);
      c++
    ) {
      let colStr = "";
      let n = c + 1;
      while (n > 0) {
        colStr = String.fromCharCode(64 + (n % 26 || 26)) + colStr;
        n = Math.floor((n - 1) / 26);
      }
      refs.push(`${colStr}${r + 1}`);
    }
  }
  return refs;
}
