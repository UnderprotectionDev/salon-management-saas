import type { CellMap } from "./spreadsheet-types";
import { parseRef, expandRange } from "./cell-refs";
// Import formula registry (side-effect: registers all formulas)
import { FORMULA_REGISTRY } from "./formulas";

// Re-export for backward compatibility
export { parseRef, expandRange };

/**
 * Evaluate a formula string against a CellMap.
 * Uses the formula registry for function dispatch.
 * Returns the computed string result or "#ERROR".
 */
export function evalFormula(raw: string, cells: CellMap, depth = 0): string {
  if (!raw.startsWith("=")) return raw;
  if (depth > 50) return "#CIRCULAR";
  const expr = raw.slice(1).trim();
  const exprUpper = expr.toUpperCase();

  try {
    // Try to match FUNCTION(args) pattern
    const funcMatch = exprUpper.match(/^([A-Z_]+)\(([\s\S]+)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const handler = FORMULA_REGISTRY.get(funcName);
      if (handler) {
        // Use original case for args (preserves string literals)
        const argsStr = expr.slice(funcName.length + 1, -1);
        return handler(argsStr.toUpperCase(), {
          cells,
          depth,
          evalFormula,
        });
      }
    }

    // No-args functions like TODAY(), NOW()
    const noArgMatch = exprUpper.match(/^([A-Z_]+)\(\s*\)$/);
    if (noArgMatch) {
      const handler = FORMULA_REGISTRY.get(noArgMatch[1]);
      if (handler) {
        return handler("", { cells, depth, evalFormula });
      }
    }

    // Handle string concatenation with & operator
    if (expr.includes("&")) {
      const parts = splitOnAmpersand(expr);
      if (parts.length > 1) {
        return parts
          .map((part) => {
            const trimmed = part.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              return trimmed.slice(1, -1);
            }
            const upper = trimmed.toUpperCase();
            if (parseRef(upper)) {
              const v = cells[upper]?.value ?? "";
              return v.startsWith("=") ? evalFormula(v, cells, depth + 1) : v;
            }
            if (upper.match(/^[A-Z_]+\(/)) {
              return evalFormula(`=${trimmed}`, cells, depth + 1);
            }
            return trimmed;
          })
          .join("");
      }
    }

    // Simple arithmetic on cell refs: =A1+B1, =A1*2
    let hasCircular = false;
    const arithExpr = exprUpper.replace(/([A-Z]+\d+)/g, (ref) => {
      const v = cells[ref]?.value ?? "0";
      const resolved = v.startsWith("=") ? evalFormula(v, cells, depth + 1) : v;
      if (resolved === "#CIRCULAR" || resolved === "#ERROR") {
        hasCircular = true;
        return "0";
      }
      return Number.isNaN(Number(resolved)) ? "0" : resolved;
    });
    if (hasCircular) return "#CIRCULAR";

    // Safe eval of basic math only
    if (/^[\d\s+\-*/.()\s]+$/.test(arithExpr)) {
      const result = new Function(`"use strict"; return (${arithExpr})`)();
      return typeof result === "number"
        ? String(Number.parseFloat(result.toFixed(10)))
        : String(result);
    }

    return "#ERROR";
  } catch {
    return "#ERROR";
  }
}

/** Split expression on & operators, respecting quotes and parentheses */
function splitOnAmpersand(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "&" && depth === 0) {
        parts.push(expr.slice(start, i));
        start = i + 1;
      }
    }
  }
  parts.push(expr.slice(start));
  return parts;
}
