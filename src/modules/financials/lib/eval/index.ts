import type { CellMap } from "../spreadsheet-types";
import { evalDateTime } from "./datetime";
import { evalFinancialConversionSalon } from "./financial-conversion-salon";
import { createEvalContext } from "./helpers";
import { evalLogicalLookup } from "./logical-lookup";
import { evalMathStats } from "./math-stats";
import { evalText } from "./text";

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

/** Build a column string from 0-indexed column number */
export function colToStr(col: number): string {
  let colStr = "";
  let n = col + 1;
  while (n > 0) {
    colStr = String.fromCharCode(64 + (n % 26 || 26)) + colStr;
    n = Math.floor((n - 1) / 26);
  }
  return colStr;
}

function safeEvalArithmetic(expr: string): number {
  let pos = 0;
  const ch = () => expr[pos] ?? "";
  const skip = () => {
    while (ch() === " ") pos++;
  };

  function parseExpr(): number {
    let result = parseTerm();
    skip();
    while (ch() === "+" || ch() === "-") {
      const op = ch();
      pos++;
      const right = parseTerm();
      result = op === "+" ? result + right : result - right;
      skip();
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    skip();
    while (ch() === "*" || ch() === "/") {
      const op = ch();
      pos++;
      const right = parseFactor();
      result = op === "*" ? result * right : result / right;
      skip();
    }
    return result;
  }

  function parseFactor(): number {
    skip();
    if (ch() === "(") {
      pos++;
      const result = parseExpr();
      skip();
      if (ch() === ")") pos++;
      return result;
    }
    if (ch() === "-") {
      pos++;
      return -parseFactor();
    }
    const start = pos;
    while (/[0-9.]/.test(ch())) pos++;
    const num = Number.parseFloat(expr.slice(start, pos));
    return Number.isNaN(num) ? 0 : num;
  }

  return parseExpr();
}

/**
 * Evaluate a formula string against a CellMap.
 * Returns the computed string result or "#ERROR".
 */
export function evalFormula(
  raw: string,
  cells: CellMap,
  depth = 0,
  customFormulas?: Record<string, string>,
): string {
  if (!raw.startsWith("=")) return raw;
  if (depth > 50) return "#CIRCULAR";
  const expr = raw.slice(1).trim().toUpperCase();

  try {
    const ctx = createEvalContext(
      cells,
      depth,
      customFormulas,
      evalFormula,
      expandRange,
      parseRef,
      colToStr,
    );

    // Try each evaluator in order
    const result =
      evalMathStats(expr, ctx) ??
      evalText(expr, ctx) ??
      evalDateTime(expr, ctx) ??
      evalLogicalLookup(expr, ctx) ??
      evalFinancialConversionSalon(expr, ctx);

    if (result !== null) return result;

    // ── Custom Formulas ─────────────────────────────────────
    if (customFormulas) {
      const customM = expr.match(/^([A-Z_][A-Z0-9_]*)\((.*)?\)$/);
      if (customM && customM[1] in customFormulas) {
        const customBody = customFormulas[customM[1]];
        return evalFormula(customBody, cells, depth + 1, customFormulas);
      }
      if (expr in customFormulas) {
        const customBody = customFormulas[expr];
        return evalFormula(customBody, cells, depth + 1, customFormulas);
      }
    }

    // Simple arithmetic on cell refs: =A1+B1, =A1*2
    let hasCircular = false;
    let hasError = false;
    const arithExpr = expr.replace(/([A-Z]+\d+)/g, (ref) => {
      const v = cells[ref]?.value ?? "0";
      const resolved = v.startsWith("=")
        ? evalFormula(v, cells, depth + 1, customFormulas)
        : v;
      if (resolved === "#CIRCULAR") {
        hasCircular = true;
        return "0";
      }
      if (resolved === "#ERROR") {
        hasError = true;
        return "0";
      }
      return Number.isNaN(Number(resolved)) ? "0" : resolved;
    });
    if (hasCircular) return "#CIRCULAR";
    if (hasError) return "#ERROR";

    // Safe eval of basic math only
    if (/^[\d+\-*/().e\s]+$/.test(arithExpr)) {
      try {
        const result = safeEvalArithmetic(arithExpr);
        if (typeof result === "number" && Number.isFinite(result)) {
          return String(Number.parseFloat(result.toFixed(10)));
        }
      } catch {
        return "#ERROR";
      }
    }

    return "#ERROR";
  } catch {
    return "#ERROR";
  }
}
