import type { CellMap } from "../spreadsheet-types";
import type { EvalContext } from "./types";

type EvalFormulaFn = (
  raw: string,
  cells: CellMap,
  depth?: number,
  customFormulas?: Record<string, string>,
) => string;

type ExpandRangeFn = (rangeStr: string) => string[];
type ParseRefFn = (ref: string) => { row: number; col: number } | null;
type ColToStrFn = (col: number) => string;

export function createEvalContext(
  cells: CellMap,
  depth: number,
  customFormulas: Record<string, string> | undefined,
  evalFormulaFn: EvalFormulaFn,
  expandRangeFn: ExpandRangeFn,
  parseRefFn: ParseRefFn,
  colToStrFn: ColToStrFn,
): EvalContext {
  const getNum = (ref: string): number => {
    const v = cells[ref]?.value ?? "";
    const resolved = v.startsWith("=")
      ? evalFormulaFn(v, cells, depth + 1, customFormulas)
      : v;
    const stripped = resolved.replace(/[₺$€%\s]/g, "");
    const lastComma = stripped.lastIndexOf(",");
    const lastDot = stripped.lastIndexOf(".");
    let cleaned: string;
    if (lastComma > lastDot) {
      cleaned = stripped.replace(/\./g, "").replace(/,/g, ".");
    } else {
      cleaned = stripped.replace(/,/g, "");
    }
    const n = Number.parseFloat(cleaned || stripped);
    return Number.isNaN(n) ? 0 : n;
  };

  const resolveArgs = (argsStr: string): number[] => {
    const nums: number[] = [];
    const args = argsStr.split(",").map((s) => s.trim());
    for (const arg of args) {
      if (arg.includes(":")) {
        for (const r of expandRangeFn(arg)) {
          nums.push(getNum(r));
        }
      } else {
        const coord = parseRefFn(arg);
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

  // Helper: split on commas not inside parentheses
  const splitArgs = (inner: string): string[] => {
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
    return parts;
  };

  // Helper: resolve a single cell ref or literal to string
  const resolveStr = (arg: string): string => {
    const trimmed = arg.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"'))
      return trimmed.slice(1, -1);
    const coord = parseRefFn(trimmed);
    if (coord) {
      const v = cells[trimmed]?.value ?? "";
      return v.startsWith("=")
        ? evalFormulaFn(v, cells, depth + 1, customFormulas)
        : v;
    }
    return trimmed;
  };

  // Helper: evaluate a condition expression like "A1>100"
  const evalCondition = (cond: string): boolean => {
    const condM = cond.match(/^(.+?)(>=|<=|<>|>|<|=)(.+)$/);
    if (!condM) return false;
    const leftRef = condM[1].trim();
    const left = Number.parseFloat(resolveStr(leftRef)) || 0;
    const right = Number.parseFloat(condM[3].trim()) || 0;
    if (condM[2] === ">") return left > right;
    if (condM[2] === "<") return left < right;
    if (condM[2] === ">=") return left >= right;
    if (condM[2] === "<=") return left <= right;
    if (condM[2] === "=") return left === right;
    if (condM[2] === "<>") return left !== right;
    return false;
  };

  // Helper: parse criteria string like ">100" into {op, val}
  const parseCriteria = (criteria: string): { op: string; val: number } => {
    const stripped = criteria.replace(/^"(.*)"$/, "$1");
    const critM = stripped.match(/^(>=|<=|<>|>|<|=)?(.+)$/);
    const op = critM?.[1] ?? "=";
    const val = Number.parseFloat(critM?.[2] ?? "0");
    return { op, val };
  };

  // Helper: check if a cell value matches criteria
  const matchesCriteria = (
    cellVal: number,
    op: string,
    critVal: number,
  ): boolean => {
    if (op === ">") return cellVal > critVal;
    if (op === "<") return cellVal < critVal;
    if (op === ">=") return cellVal >= critVal;
    if (op === "<=") return cellVal <= critVal;
    if (op === "<>") return cellVal !== critVal;
    return cellVal === critVal;
  };

  // Helper: get numeric value, resolving nested formulas
  const getNumResolved = (argStr: string): number => {
    const trimmed = argStr.trim();
    const coord = parseRefFn(trimmed);
    if (coord) return getNum(trimmed);
    // Try evaluating as sub-expression
    if (trimmed.includes("(")) {
      const result = evalFormulaFn(
        `=${trimmed}`,
        cells,
        depth + 1,
        customFormulas,
      );
      const n = Number.parseFloat(result);
      return Number.isNaN(n) ? 0 : n;
    }
    const n = Number.parseFloat(trimmed);
    return Number.isNaN(n) ? 0 : n;
  };

  return {
    getNum,
    resolveArgs,
    splitArgs,
    resolveStr,
    evalCondition,
    parseCriteria,
    matchesCriteria,
    getNumResolved,
    cells,
    evalFormula: evalFormulaFn,
    expandRange: expandRangeFn,
    parseRef: parseRefFn,
    colToStr: colToStrFn,
    depth,
    customFormulas,
  };
}
