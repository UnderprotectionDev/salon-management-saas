import {
  type FormulaContext,
  getNum,
  registerFormula,
  resolveArgs,
  splitTopLevelArgs,
} from "./registry";
import { expandRange, parseRef } from "../cell-refs";

// SUM
registerFormula("SUM", (argsStr, ctx) => {
  const vals = resolveArgs(argsStr, ctx);
  return String(vals.reduce((a, b) => a + b, 0));
});

// AVERAGE / AVG
function averageHandler(argsStr: string, ctx: FormulaContext): string {
  const vals = resolveArgs(argsStr, ctx);
  if (vals.length === 0) return "0";
  return String(vals.reduce((a, b) => a + b, 0) / vals.length);
}
registerFormula("AVERAGE", averageHandler);
registerFormula("AVG", averageHandler);

// COUNT (numeric cells only)
registerFormula("COUNT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  let count = 0;
  for (const a of args) {
    if (a.includes(":")) {
      for (const r of expandRange(a)) {
        const val = ctx.cells[r]?.value ?? "";
        const resolved = val.startsWith("=")
          ? ctx.evalFormula(val, ctx.cells, ctx.depth + 1)
          : val;
        if (resolved && !Number.isNaN(Number(resolved))) count++;
      }
    } else if (parseRef(a)) {
      const val = ctx.cells[a]?.value ?? "";
      const resolved = val.startsWith("=")
        ? ctx.evalFormula(val, ctx.cells, ctx.depth + 1)
        : val;
      if (resolved && !Number.isNaN(Number(resolved))) count++;
    }
  }
  return String(count);
});

// COUNTA (non-empty cells)
registerFormula("COUNTA", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  let count = 0;
  for (const a of args) {
    if (a.includes(":")) {
      for (const r of expandRange(a)) {
        const val = ctx.cells[r]?.value ?? "";
        const resolved = val.startsWith("=")
          ? ctx.evalFormula(val, ctx.cells, ctx.depth + 1)
          : val;
        if (resolved) count++;
      }
    } else if (parseRef(a)) {
      const val = ctx.cells[a]?.value ?? "";
      const resolved = val.startsWith("=")
        ? ctx.evalFormula(val, ctx.cells, ctx.depth + 1)
        : val;
      if (resolved) count++;
    }
  }
  return String(count);
});

// MIN
registerFormula("MIN", (argsStr, ctx) => {
  const vals = resolveArgs(argsStr, ctx);
  return vals.length ? String(Math.min(...vals)) : "0";
});

// MAX
registerFormula("MAX", (argsStr, ctx) => {
  const vals = resolveArgs(argsStr, ctx);
  return vals.length ? String(Math.max(...vals)) : "0";
});

// ROUND
registerFormula("ROUND", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const digits =
    args.length > 1
      ? parseRef(args[1])
        ? getNum(args[1], ctx)
        : Number.parseFloat(args[1])
      : 0;
  if (Number.isNaN(num)) return "#ERROR";
  const factor = 10 ** Math.round(digits);
  return String(Math.round(num * factor) / factor);
});

// ROUNDUP
registerFormula("ROUNDUP", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const digits =
    args.length > 1
      ? parseRef(args[1])
        ? getNum(args[1], ctx)
        : Number.parseFloat(args[1])
      : 0;
  if (Number.isNaN(num)) return "#ERROR";
  const factor = 10 ** Math.round(digits);
  const sign = num >= 0 ? 1 : -1;
  return String((sign * Math.ceil(Math.abs(num) * factor)) / factor);
});

// ROUNDDOWN
registerFormula("ROUNDDOWN", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const digits =
    args.length > 1
      ? parseRef(args[1])
        ? getNum(args[1], ctx)
        : Number.parseFloat(args[1])
      : 0;
  if (Number.isNaN(num)) return "#ERROR";
  const factor = 10 ** Math.round(digits);
  const sign = num >= 0 ? 1 : -1;
  return String((sign * Math.floor(Math.abs(num) * factor)) / factor);
});

// ABS
registerFormula("ABS", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  if (Number.isNaN(num)) return "#ERROR";
  return String(Math.abs(num));
});

// MOD
registerFormula("MOD", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const divisor = parseRef(args[1])
    ? getNum(args[1], ctx)
    : Number.parseFloat(args[1]);
  if (Number.isNaN(num) || Number.isNaN(divisor) || divisor === 0)
    return "#ERROR";
  // Excel MOD: result has same sign as divisor
  return String(num - divisor * Math.floor(num / divisor));
});

// POWER
registerFormula("POWER", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const base = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const exp = parseRef(args[1])
    ? getNum(args[1], ctx)
    : Number.parseFloat(args[1]);
  if (Number.isNaN(base) || Number.isNaN(exp)) return "#ERROR";
  return String(base ** exp);
});

// SQRT
registerFormula("SQRT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  if (Number.isNaN(num) || num < 0) return "#ERROR";
  return String(Math.sqrt(num));
});

// INT (truncate to integer)
registerFormula("INT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  if (Number.isNaN(num)) return "#ERROR";
  return String(Math.floor(num));
});

// CEILING
registerFormula("CEILING", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const sig = parseRef(args[1])
    ? getNum(args[1], ctx)
    : Number.parseFloat(args[1]);
  if (Number.isNaN(num) || Number.isNaN(sig) || sig === 0) return "#ERROR";
  return String(Math.ceil(num / sig) * sig);
});

// FLOOR
registerFormula("FLOOR", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const num = parseRef(args[0])
    ? getNum(args[0], ctx)
    : Number.parseFloat(args[0]);
  const sig = parseRef(args[1])
    ? getNum(args[1], ctx)
    : Number.parseFloat(args[1]);
  if (Number.isNaN(num) || Number.isNaN(sig) || sig === 0) return "#ERROR";
  return String(Math.floor(num / sig) * sig);
});
