import type { CellMap } from "./spreadsheet-types";

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
      // rebuild cell ref from row/col
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

/**
 * Evaluate a formula string against a CellMap.
 * Supports: SUM, AVERAGE/AVG, COUNT, COUNTA, MIN, MAX, IF, basic arithmetic.
 * Returns the computed string result or "#ERROR".
 */
export function evalFormula(raw: string, cells: CellMap, depth = 0): string {
  if (!raw.startsWith("=")) return raw;
  if (depth > 50) return "#CIRCULAR";
  const expr = raw.slice(1).trim().toUpperCase();

  const getNum = (ref: string): number => {
    const v = cells[ref]?.value ?? "";
    // Recursively evaluate if the referenced cell is also a formula
    const resolved = v.startsWith("=") ? evalFormula(v, cells, depth + 1) : v;
    // Strip currency symbols, percent signs, whitespace, and locale formatting
    const cleaned = resolved
      .replace(/[₺$€%\s]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const n = Number.parseFloat(cleaned || resolved);
    return Number.isNaN(n) ? 0 : n;
  };

  const resolveArgs = (argsStr: string): number[] => {
    const nums: number[] = [];
    const args = argsStr.split(",").map((s) => s.trim());
    for (const arg of args) {
      if (arg.includes(":")) {
        for (const r of expandRange(arg)) {
          nums.push(getNum(r));
        }
      } else {
        const coord = parseRef(arg);
        if (coord) {
          nums.push(getNum(arg));
        } else {
          const n = Number.parseFloat(arg);
          if (!Number.isNaN(n)) nums.push(n);
        }
      }
    }
    return nums;
  };

  try {
    // SUM
    const sumM = expr.match(/^SUM\((.+)\)$/);
    if (sumM) {
      const vals = resolveArgs(sumM[1]);
      return String(vals.reduce((a, b) => a + b, 0));
    }

    // AVERAGE / AVG
    const avgM = expr.match(/^(?:AVERAGE|AVG)\((.+)\)$/);
    if (avgM) {
      const vals = resolveArgs(avgM[1]);
      if (vals.length === 0) return "0";
      return String(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    // COUNT (numeric cells only — resolves formulas before checking)
    const cntM = expr.match(/^COUNT\((.+)\)$/);
    if (cntM) {
      const args = cntM[1].split(",").map((s) => s.trim());
      let count = 0;
      for (const a of args) {
        if (a.includes(":")) {
          for (const r of expandRange(a)) {
            const val = cells[r]?.value ?? "";
            const resolved = val.startsWith("=")
              ? evalFormula(val, cells, depth + 1)
              : val;
            if (resolved && !Number.isNaN(Number(resolved))) count++;
          }
        } else if (parseRef(a)) {
          const val = cells[a]?.value ?? "";
          const resolved = val.startsWith("=")
            ? evalFormula(val, cells, depth + 1)
            : val;
          if (resolved && !Number.isNaN(Number(resolved))) count++;
        }
      }
      return String(count);
    }

    // COUNTA (non-empty cells — resolves formulas before checking)
    const cntaM = expr.match(/^COUNTA\((.+)\)$/);
    if (cntaM) {
      const args = cntaM[1].split(",").map((s) => s.trim());
      let count = 0;
      for (const a of args) {
        if (a.includes(":")) {
          for (const r of expandRange(a)) {
            const val = cells[r]?.value ?? "";
            const resolved = val.startsWith("=")
              ? evalFormula(val, cells, depth + 1)
              : val;
            if (resolved) count++;
          }
        } else if (parseRef(a)) {
          const val = cells[a]?.value ?? "";
          const resolved = val.startsWith("=")
            ? evalFormula(val, cells, depth + 1)
            : val;
          if (resolved) count++;
        }
      }
      return String(count);
    }

    // MIN
    const minM = expr.match(/^MIN\((.+)\)$/);
    if (minM) {
      const vals = resolveArgs(minM[1]);
      return vals.length ? String(Math.min(...vals)) : "0";
    }

    // MAX
    const maxM = expr.match(/^MAX\((.+)\)$/);
    if (maxM) {
      const vals = resolveArgs(maxM[1]);
      return vals.length ? String(Math.max(...vals)) : "0";
    }

    // IF(condition, true_val, false_val) — parenthesis-aware comma splitting
    if (expr.startsWith("IF(") && expr.endsWith(")")) {
      const inner = expr.slice(3, -1);
      // Split on commas that aren't inside nested parentheses
      const parts: string[] = [];
      let parenDepth = 0;
      let start = 0;
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === "(") parenDepth++;
        else if (inner[i] === ")") parenDepth--;
        else if (inner[i] === "," && parenDepth === 0) {
          parts.push(inner.slice(start, i));
          start = i + 1;
        }
      }
      parts.push(inner.slice(start));
      if (parts.length === 3) {
        const cond = parts[0].trim();
        const trueVal = parts[1].trim();
        const falseVal = parts[2].trim();
        const condM = cond.match(/^(.+?)(>=|<=|<>|>|<|=)(.+)$/);
        if (condM) {
          const leftRef = condM[1].trim();
          const left = Number.parseFloat(cells[leftRef]?.value ?? leftRef) || 0;
          const right = Number.parseFloat(condM[3].trim()) || 0;
          let result = false;
          if (condM[2] === ">") result = left > right;
          else if (condM[2] === "<") result = left < right;
          else if (condM[2] === ">=") result = left >= right;
          else if (condM[2] === "<=") result = left <= right;
          else if (condM[2] === "=" || condM[2] === "==")
            result = left === right;
          else if (condM[2] === "<>") result = left !== right;
          return result
            ? trueVal.replace(/^"(.*)"$/, "$1")
            : falseVal.replace(/^"(.*)"$/, "$1");
        }
      }
    }

    // Simple arithmetic on cell refs: =A1+B1, =A1*2
    let hasCircular = false;
    const arithExpr = expr.replace(/([A-Z]+\d+)/g, (ref) => {
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
