import {
  getNum,
  getRawValue,
  registerFormula,
  splitTopLevelArgs,
} from "./registry";
import { parseRef } from "../cell-refs";

function resolveTextArg(
  arg: string,
  ctx: import("./registry").FormulaContext,
): string {
  const trimmed = arg.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (parseRef(trimmed)) {
    return getRawValue(trimmed, ctx);
  }
  if (trimmed.match(/^[A-Z]+\(/)) {
    return ctx.evalFormula(`=${trimmed}`, ctx.cells, ctx.depth + 1);
  }
  return trimmed;
}

// LEFT(text, [num_chars])
registerFormula("LEFT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const text = resolveTextArg(args[0], ctx);
  const count =
    args.length > 1
      ? Math.round(
          parseRef(args[1].trim())
            ? getNum(args[1].trim(), ctx)
            : Number.parseFloat(args[1]),
        )
      : 1;
  if (Number.isNaN(count) || count < 0) return "#ERROR";
  return text.slice(0, count);
});

// RIGHT(text, [num_chars])
registerFormula("RIGHT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const text = resolveTextArg(args[0], ctx);
  const count =
    args.length > 1
      ? Math.round(
          parseRef(args[1].trim())
            ? getNum(args[1].trim(), ctx)
            : Number.parseFloat(args[1]),
        )
      : 1;
  if (Number.isNaN(count) || count < 0) return "#ERROR";
  return text.slice(-count);
});

// MID(text, start_num, num_chars)
registerFormula("MID", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const text = resolveTextArg(args[0], ctx);
  const start = Math.round(
    parseRef(args[1].trim())
      ? getNum(args[1].trim(), ctx)
      : Number.parseFloat(args[1]),
  );
  const count = Math.round(
    parseRef(args[2].trim())
      ? getNum(args[2].trim(), ctx)
      : Number.parseFloat(args[2]),
  );
  if (Number.isNaN(start) || Number.isNaN(count) || start < 1 || count < 0)
    return "#ERROR";
  return text.slice(start - 1, start - 1 + count);
});

// LEN(text)
registerFormula("LEN", (argsStr, ctx) => {
  const text = resolveTextArg(argsStr.trim(), ctx);
  return String(text.length);
});

// CONCATENATE(text1, text2, ...)
registerFormula("CONCATENATE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  return args.map((a) => resolveTextArg(a, ctx)).join("");
});

// CONCAT (alias for CONCATENATE)
registerFormula("CONCAT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  return args.map((a) => resolveTextArg(a, ctx)).join("");
});

// TRIM(text)
registerFormula("TRIM", (argsStr, ctx) => {
  const text = resolveTextArg(argsStr.trim(), ctx);
  return text.replace(/\s+/g, " ").trim();
});

// UPPER(text)
registerFormula("UPPER", (argsStr, ctx) => {
  return resolveTextArg(argsStr.trim(), ctx).toUpperCase();
});

// LOWER(text)
registerFormula("LOWER", (argsStr, ctx) => {
  return resolveTextArg(argsStr.trim(), ctx).toLowerCase();
});

// PROPER(text) - Title Case
registerFormula("PROPER", (argsStr, ctx) => {
  const text = resolveTextArg(argsStr.trim(), ctx);
  return text.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
});

// SUBSTITUTE(text, old_text, new_text, [instance_num])
registerFormula("SUBSTITUTE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const text = resolveTextArg(args[0], ctx);
  const oldText = resolveTextArg(args[1], ctx);
  const newText = resolveTextArg(args[2], ctx);

  if (args.length > 3) {
    const instanceNum = Math.round(
      parseRef(args[3].trim())
        ? getNum(args[3].trim(), ctx)
        : Number.parseFloat(args[3]),
    );
    if (Number.isNaN(instanceNum) || instanceNum < 1) return "#ERROR";
    let count = 0;
    return text.replace(
      new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      (match) => {
        count++;
        return count === instanceNum ? newText : match;
      },
    );
  }
  return text.split(oldText).join(newText);
});

// FIND(find_text, within_text, [start_num]) - case-sensitive
registerFormula("FIND", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const findText = resolveTextArg(args[0], ctx);
  const withinText = resolveTextArg(args[1], ctx);
  const startNum =
    args.length > 2
      ? Math.round(
          parseRef(args[2].trim())
            ? getNum(args[2].trim(), ctx)
            : Number.parseFloat(args[2]),
        )
      : 1;
  if (Number.isNaN(startNum) || startNum < 1) return "#ERROR";
  const idx = withinText.indexOf(findText, startNum - 1);
  return idx === -1 ? "#ERROR" : String(idx + 1);
});

// SEARCH(find_text, within_text, [start_num]) - case-insensitive
registerFormula("SEARCH", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const findText = resolveTextArg(args[0], ctx).toLowerCase();
  const withinText = resolveTextArg(args[1], ctx).toLowerCase();
  const startNum =
    args.length > 2
      ? Math.round(
          parseRef(args[2].trim())
            ? getNum(args[2].trim(), ctx)
            : Number.parseFloat(args[2]),
        )
      : 1;
  if (Number.isNaN(startNum) || startNum < 1) return "#ERROR";
  const idx = withinText.indexOf(findText, startNum - 1);
  return idx === -1 ? "#ERROR" : String(idx + 1);
});

// REPLACE(old_text, start_num, num_chars, new_text)
registerFormula("REPLACE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 4) return "#ERROR";
  const text = resolveTextArg(args[0], ctx);
  const start = Math.round(
    parseRef(args[1].trim())
      ? getNum(args[1].trim(), ctx)
      : Number.parseFloat(args[1]),
  );
  const count = Math.round(
    parseRef(args[2].trim())
      ? getNum(args[2].trim(), ctx)
      : Number.parseFloat(args[2]),
  );
  const newText = resolveTextArg(args[3], ctx);
  if (Number.isNaN(start) || Number.isNaN(count) || start < 1) return "#ERROR";
  return text.slice(0, start - 1) + newText + text.slice(start - 1 + count);
});

// REPT(text, number_times)
registerFormula("REPT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const text = resolveTextArg(args[0], ctx);
  const times = Math.round(
    parseRef(args[1].trim())
      ? getNum(args[1].trim(), ctx)
      : Number.parseFloat(args[1]),
  );
  if (Number.isNaN(times) || times < 0) return "#ERROR";
  return text.repeat(times);
});

// TEXT(value, format) - simplified
registerFormula("TEXT", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const val = parseRef(args[0].trim())
    ? getNum(args[0].trim(), ctx)
    : Number.parseFloat(args[0]);
  const fmt = resolveTextArg(args[1], ctx);
  if (Number.isNaN(val)) return "#ERROR";

  // Simple format patterns
  if (fmt === "0") return String(Math.round(val));
  if (fmt === "0.00") return val.toFixed(2);
  if (fmt === "0.0") return val.toFixed(1);
  if (fmt === "#,##0") return Math.round(val).toLocaleString();
  if (fmt === "#,##0.00")
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (fmt === "0%") return `${Math.round(val * 100)}%`;
  if (fmt === "0.00%") return `${(val * 100).toFixed(2)}%`;
  return String(val);
});

// VALUE(text) - convert text to number
registerFormula("VALUE", (argsStr, ctx) => {
  const text = resolveTextArg(argsStr.trim(), ctx);
  const cleaned = text
    .replace(/[₺$€%\s]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? "#ERROR" : String(n);
});
