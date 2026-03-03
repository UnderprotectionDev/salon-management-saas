import {
  type FormulaContext,
  getNum,
  getRawValue,
  registerFormula,
  splitTopLevelArgs,
} from "./registry";
import { parseRef } from "../cell-refs";

/** Evaluate a condition string like "A1>5" */
function evalCondition(cond: string, ctx: FormulaContext): boolean {
  const condM = cond.match(/^(.+?)(>=|<=|<>|>|<|=)(.+)$/);
  if (!condM) {
    // Try as boolean: non-zero = true
    const ref = cond.trim();
    const val = parseRef(ref) ? getNum(ref, ctx) : Number.parseFloat(ref);
    return !Number.isNaN(val) && val !== 0;
  }
  const leftRef = condM[1].trim();
  const left = parseRef(leftRef)
    ? getNum(leftRef, ctx)
    : Number.parseFloat(leftRef) || 0;
  const rightRef = condM[3].trim();
  const right = parseRef(rightRef)
    ? getNum(rightRef, ctx)
    : Number.parseFloat(rightRef) || 0;
  const op = condM[2];
  if (op === ">") return left > right;
  if (op === "<") return left < right;
  if (op === ">=") return left >= right;
  if (op === "<=") return left <= right;
  if (op === "=" || op === "==") return left === right;
  if (op === "<>") return left !== right;
  return false;
}

// IF(condition, true_val, false_val)
registerFormula("IF", (argsStr, ctx) => {
  const parts = splitTopLevelArgs(argsStr);
  if (parts.length < 2) return "#ERROR";

  const cond = parts[0].trim();
  const trueVal = parts[1].trim();
  const falseVal = parts.length > 2 ? parts[2].trim() : "FALSE";

  const result = evalCondition(cond, ctx);
  const chosen = result ? trueVal : falseVal;

  // If chosen is a string literal, strip quotes
  if (chosen.startsWith('"') && chosen.endsWith('"')) {
    return chosen.slice(1, -1);
  }
  // If it's a cell ref, resolve it
  if (parseRef(chosen)) {
    return getRawValue(chosen, ctx);
  }
  // If it's a formula function call, evaluate it
  if (chosen.match(/^[A-Z]+\(/)) {
    return ctx.evalFormula(`=${chosen}`, ctx.cells, ctx.depth + 1);
  }
  return chosen;
});

// AND(cond1, cond2, ...)
registerFormula("AND", (argsStr, ctx) => {
  const parts = splitTopLevelArgs(argsStr);
  if (parts.length === 0) return "#ERROR";
  for (const part of parts) {
    if (!evalCondition(part, ctx)) return "FALSE";
  }
  return "TRUE";
});

// OR(cond1, cond2, ...)
registerFormula("OR", (argsStr, ctx) => {
  const parts = splitTopLevelArgs(argsStr);
  if (parts.length === 0) return "#ERROR";
  for (const part of parts) {
    if (evalCondition(part, ctx)) return "TRUE";
  }
  return "FALSE";
});

// NOT(condition)
registerFormula("NOT", (argsStr, ctx) => {
  const cond = argsStr.trim();
  return evalCondition(cond, ctx) ? "FALSE" : "TRUE";
});

// IFERROR(value, value_if_error)
registerFormula("IFERROR", (argsStr, ctx) => {
  const parts = splitTopLevelArgs(argsStr);
  if (parts.length < 2) return "#ERROR";
  const val = parts[0].trim();
  const errorVal = parts[1].trim();

  let result: string;
  if (parseRef(val)) {
    result = getRawValue(val, ctx);
  } else if (val.match(/^[A-Z]+\(/)) {
    result = ctx.evalFormula(`=${val}`, ctx.cells, ctx.depth + 1);
  } else {
    result = val.replace(/^"(.*)"$/, "$1");
  }

  if (
    result === "#ERROR" ||
    result === "#CIRCULAR" ||
    result === "#N/A" ||
    result === "#VALUE!"
  ) {
    return errorVal.replace(/^"(.*)"$/, "$1");
  }
  return result;
});

// ISBLANK(ref)
registerFormula("ISBLANK", (argsStr, ctx) => {
  const ref = argsStr.trim();
  if (!parseRef(ref)) return "#ERROR";
  const val = ctx.cells[ref]?.value ?? "";
  return val === "" ? "TRUE" : "FALSE";
});

// ISNUMBER(value)
registerFormula("ISNUMBER", (argsStr, ctx) => {
  const ref = argsStr.trim();
  let val: string;
  if (parseRef(ref)) {
    val = getRawValue(ref, ctx);
  } else {
    val = ref;
  }
  return !Number.isNaN(Number(val)) && val !== "" ? "TRUE" : "FALSE";
});

// ISTEXT(value)
registerFormula("ISTEXT", (argsStr, ctx) => {
  const ref = argsStr.trim();
  let val: string;
  if (parseRef(ref)) {
    val = getRawValue(ref, ctx);
  } else {
    val = ref;
  }
  return Number.isNaN(Number(val)) && val !== "" ? "TRUE" : "FALSE";
});

// TRUE()
registerFormula("TRUE", () => "TRUE");

// FALSE()
registerFormula("FALSE", () => "FALSE");
