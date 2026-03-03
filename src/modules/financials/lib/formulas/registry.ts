import type { CellMap } from "../spreadsheet-types";
import { expandRange, parseRef } from "../cell-refs";

/** Context passed to every formula handler */
export interface FormulaContext {
  cells: CellMap;
  depth: number;
  evalFormula: (raw: string, cells: CellMap, depth?: number) => string;
}

/** A formula handler takes the raw arguments string and returns a result */
export type FormulaHandler = (argsStr: string, ctx: FormulaContext) => string;

/** Global formula registry */
export const FORMULA_REGISTRY = new Map<string, FormulaHandler>();

/** Register a formula function */
export function registerFormula(name: string, handler: FormulaHandler) {
  FORMULA_REGISTRY.set(name.toUpperCase(), handler);
}

/** Get all registered formula names */
export function getAllFormulaNames(): string[] {
  return Array.from(FORMULA_REGISTRY.keys()).sort();
}

// ---- Shared utility functions used by formula handlers ----

/** Resolve a cell value to a number, recursively evaluating formulas */
export function getNum(ref: string, ctx: FormulaContext): number {
  const v = ctx.cells[ref]?.value ?? "";
  const resolved = v.startsWith("=")
    ? ctx.evalFormula(v, ctx.cells, ctx.depth + 1)
    : v;
  const cleaned = resolved
    .replace(/[₺$€%\s]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number.parseFloat(cleaned || resolved);
  return Number.isNaN(n) ? 0 : n;
}

/** Get raw resolved value (string, not coerced to number) */
export function getRawValue(ref: string, ctx: FormulaContext): string {
  const v = ctx.cells[ref]?.value ?? "";
  return v.startsWith("=") ? ctx.evalFormula(v, ctx.cells, ctx.depth + 1) : v;
}

/** Check if an arg is a quoted string literal */
function isQuotedString(arg: string): boolean {
  const trimmed = arg.trim();
  return trimmed.startsWith('"') && trimmed.endsWith('"');
}

/** Resolve a list of arguments (ranges, refs, literals) into numbers */
export function resolveArgs(argsStr: string, ctx: FormulaContext): number[] {
  const nums: number[] = [];
  const args = splitTopLevelArgs(argsStr);
  for (const arg of args) {
    const trimmed = arg.trim();
    // Skip quoted strings — they're not numeric
    if (isQuotedString(trimmed)) continue;
    if (trimmed.includes(":") && parseRef(trimmed.split(":")[0])) {
      for (const r of expandRange(trimmed)) {
        nums.push(getNum(r, ctx));
      }
    } else {
      const coord = parseRef(trimmed);
      if (coord) {
        nums.push(getNum(trimmed, ctx));
      } else {
        const n = Number.parseFloat(trimmed);
        if (!Number.isNaN(n)) nums.push(n);
      }
    }
  }
  return nums;
}

/** Resolve arguments into raw string values */
export function resolveRawArgs(argsStr: string, ctx: FormulaContext): string[] {
  const values: string[] = [];
  const args = splitTopLevelArgs(argsStr);
  for (const arg of args) {
    const trimmed = arg.trim();
    // Handle quoted strings first (may contain colons)
    if (isQuotedString(trimmed)) {
      values.push(trimmed.slice(1, -1));
    } else if (trimmed.includes(":") && parseRef(trimmed.split(":")[0])) {
      for (const r of expandRange(trimmed)) {
        values.push(getRawValue(r, ctx));
      }
    } else {
      const coord = parseRef(trimmed);
      if (coord) {
        values.push(getRawValue(trimmed, ctx));
      } else {
        values.push(trimmed.replace(/^"(.*)"$/, "$1"));
      }
    }
  }
  return values;
}

/** Split arguments on commas respecting nested parentheses and quotes */
export function splitTopLevelArgs(argsStr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;
  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === '"' && (i === 0 || argsStr[i - 1] !== "\\")) {
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        parts.push(argsStr.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  parts.push(argsStr.slice(start).trim());
  return parts;
}
