/**
 * Extract formula references and assign colors for highlighting.
 */

/** Colors for formula reference highlighting */
export const FORMULA_REF_COLORS = [
  "#4285f4", // blue
  "#34a853", // green
  "#ea4335", // red
  "#9334e6", // purple
  "#f57c00", // orange
] as const;

interface FormulaRef {
  /** The reference text, e.g. "A1" or "A1:B3" */
  text: string;
  /** Start index in the formula string (after "=") */
  start: number;
  /** End index in the formula string (after "=") */
  end: number;
}

/**
 * Extract all cell references and ranges from a formula string.
 * Input should be the raw formula including the leading "=".
 */
export function extractFormulaRefs(formula: string): FormulaRef[] {
  if (!formula.startsWith("=")) return [];
  const expr = formula.slice(1);
  const refs: FormulaRef[] = [];

  // Match ranges like A1:B3 or single refs like A1 (with optional $ for absolute)
  const pattern = /\$?[A-Z]{1,3}\$?\d{1,5}(?::\$?[A-Z]{1,3}\$?\d{1,5})?/g;
  let match = pattern.exec(expr);
  while (match !== null) {
    refs.push({
      text: match[0],
      start: match.index + 1, // +1 for the "="
      end: match.index + match[0].length + 1,
    });
    match = pattern.exec(expr);
  }
  return refs;
}

/**
 * Assign a color to each unique reference in a formula.
 * Returns a Map from cell ref (e.g. "A1") to color string.
 * For ranges, each cell in the range gets the same color.
 */
export function assignRefColors(refs: FormulaRef[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  const seen = new Set<string>();

  for (const ref of refs) {
    if (seen.has(ref.text)) continue;
    seen.add(ref.text);
    const colorIdx = seen.size - 1;
    const color = FORMULA_REF_COLORS[colorIdx % FORMULA_REF_COLORS.length];

    if (ref.text.includes(":")) {
      // Range: expand to individual cells
      const [startRef, endRef] = ref.text.split(":");
      const startParsed = parseSimpleRef(startRef);
      const endParsed = parseSimpleRef(endRef);
      if (startParsed && endParsed) {
        for (
          let r = Math.min(startParsed.row, endParsed.row);
          r <= Math.max(startParsed.row, endParsed.row);
          r++
        ) {
          for (
            let c = Math.min(startParsed.col, endParsed.col);
            c <= Math.max(startParsed.col, endParsed.col);
            c++
          ) {
            colorMap.set(buildRef(r, c), color);
          }
        }
      }
    } else {
      const parsed = parseSimpleRef(ref.text);
      if (parsed) {
        colorMap.set(buildRef(parsed.row, parsed.col), color);
      }
    }
  }
  return colorMap;
}

/** Parse a ref like "$A$1" or "A1" to {row, col} (0-indexed) */
function parseSimpleRef(ref: string): { row: number; col: number } | null {
  const clean = ref.replace(/\$/g, "");
  const m = clean.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return { row: Number.parseInt(m[2], 10) - 1, col: col - 1 };
}

function buildRef(row: number, col: number): string {
  let colStr = "";
  let n = col + 1;
  while (n > 0) {
    colStr = String.fromCharCode(64 + (n % 26 || 26)) + colStr;
    n = Math.floor((n - 1) / 26);
  }
  return `${colStr}${row + 1}`;
}
