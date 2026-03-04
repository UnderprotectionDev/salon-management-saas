import type { EvalContext } from "./types";

/**
 * Text functions: CONCATENATE, CONCAT, LEFT, RIGHT, MID, LEN, UPPER, LOWER,
 * TRIM, EXACT, REPLACE, SEARCH, CHAR, CODE, CLEAN, TEXTJOIN, NUMBERVALUE,
 * FIXED, T, UNICODE
 */
export function evalText(expr: string, ctx: EvalContext): string | null {
  const {
    splitArgs,
    resolveStr,
    getNumResolved,
    expandRange,
    parseRef,
    cells,
  } = ctx;

  // CONCATENATE(text1, text2, ...) — must come before CONCAT
  const concatM = expr.match(/^CONCATENATE\((.+)\)$/);
  if (concatM) {
    const args = splitArgs(concatM[1]);
    return args.map((a) => resolveStr(a)).join("");
  }

  // CONCAT(text1, text2, ...)
  if (
    expr.startsWith("CONCAT(") &&
    expr.endsWith(")") &&
    !expr.startsWith("CONCATENATE(")
  ) {
    const inner = expr.slice(7, -1);
    const args = splitArgs(inner);
    return args.map((a) => resolveStr(a)).join("");
  }

  // LEFT(text, num_chars)
  const leftM = expr.match(/^LEFT\((.+)\)$/);
  if (leftM) {
    const args = splitArgs(leftM[1]);
    const text = resolveStr(args[0]);
    const n = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    return text.slice(0, n);
  }

  // RIGHT(text, num_chars)
  const rightM = expr.match(/^RIGHT\((.+)\)$/);
  if (rightM) {
    const args = splitArgs(rightM[1]);
    const text = resolveStr(args[0]);
    const n = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    if (n <= 0) return "";
    return text.slice(-n);
  }

  // MID(text, start, num_chars)
  const midM = expr.match(/^MID\((.+)\)$/);
  if (midM) {
    const args = splitArgs(midM[1]);
    const text = resolveStr(args[0]);
    const startNum = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    const n = args[2] ? Number.parseInt(args[2].trim(), 10) : 1;
    if (startNum < 1 || n < 0) return "#VALUE!";
    return text.slice(startNum - 1, startNum - 1 + n);
  }

  // LEN(text)
  const lenM = expr.match(/^LEN\((.+)\)$/);
  if (lenM) {
    return String(resolveStr(lenM[1]).length);
  }

  // UPPER(text)
  const upperM = expr.match(/^UPPER\((.+)\)$/);
  if (upperM) {
    return resolveStr(upperM[1]).toUpperCase();
  }

  // LOWER(text)
  const lowerM = expr.match(/^LOWER\((.+)\)$/);
  if (lowerM) {
    return resolveStr(lowerM[1]).toLowerCase();
  }

  // TRIM(text)
  const trimM = expr.match(/^TRIM\((.+)\)$/);
  if (trimM) {
    return resolveStr(trimM[1]).replace(/\s+/g, " ").trim();
  }

  // EXACT(text1, text2)
  const exactM = expr.match(/^EXACT\((.+)\)$/);
  if (exactM) {
    const args = splitArgs(exactM[1]);
    // Case-sensitive comparison — use original case
    const orig1 = args[0].trim();
    const orig2 = (args[1] ?? "").trim();
    const str1 = orig1.startsWith('"')
      ? orig1.slice(1, -1)
      : parseRef(orig1)
        ? (cells[orig1]?.value ?? "")
        : orig1;
    const str2 = orig2.startsWith('"')
      ? orig2.slice(1, -1)
      : parseRef(orig2)
        ? (cells[orig2]?.value ?? "")
        : orig2;
    return str1 === str2 ? "TRUE" : "FALSE";
  }

  // REPLACE(old_text, start, num_chars, new_text)
  if (expr.startsWith("REPLACE(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    if (args.length >= 4) {
      const text = resolveStr(args[0]);
      const start = Number.parseInt(args[1].trim(), 10) - 1;
      const numChars = Number.parseInt(args[2].trim(), 10);
      const newText = resolveStr(args[3]);
      return text.slice(0, start) + newText + text.slice(start + numChars);
    }
    return "#VALUE!";
  }

  // SEARCH(find_text, within_text, start) — case-insensitive FIND
  if (expr.startsWith("SEARCH(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1);
    const args = splitArgs(inner);
    const needle = resolveStr(args[0]).toLowerCase();
    const haystack = resolveStr(args[1] ?? "").toLowerCase();
    const start = args[2] ? Number.parseInt(args[2].trim(), 10) - 1 : 0;
    const idx = haystack.indexOf(needle, start);
    return idx === -1 ? "#VALUE!" : String(idx + 1);
  }

  // CHAR(number)
  const charM = expr.match(/^CHAR\((.+)\)$/);
  if (charM) {
    const code = Math.floor(getNumResolved(charM[1]));
    if (code < 1 || code > 255) return "#VALUE!";
    return String.fromCharCode(code);
  }

  // CODE(text)
  const codeM = expr.match(/^CODE\((.+)\)$/);
  if (codeM) {
    const text = resolveStr(codeM[1]);
    return text.length > 0 ? String(text.charCodeAt(0)) : "#VALUE!";
  }

  // CLEAN(text) — removes non-printable control characters
  const cleanM = expr.match(/^CLEAN\((.+)\)$/);
  if (cleanM) {
    const text = resolveStr(cleanM[1]);
    // biome-ignore lint/suspicious/noControlCharactersInRegex: CLEAN intentionally removes control chars
    return text.replace(/[\x00-\x1F]/g, "");
  }

  // TEXTJOIN(delimiter, ignore_empty, range)
  if (expr.startsWith("TEXTJOIN(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const delimiter = resolveStr(args[0]);
      const ignoreEmpty = getNumResolved(args[1]) !== 0;
      const values: string[] = [];
      for (let i = 2; i < args.length; i++) {
        const rangeStr = args[i].trim();
        const refs = rangeStr.includes(":")
          ? expandRange(rangeStr)
          : [rangeStr];
        for (const ref of refs) {
          const val = resolveStr(ref);
          if (ignoreEmpty && !val) continue;
          values.push(val);
        }
      }
      return values.join(delimiter);
    }
  }

  // NUMBERVALUE(text, decimal_sep, group_sep)
  if (expr.startsWith("NUMBERVALUE(") && expr.endsWith(")")) {
    const inner = expr.slice(12, -1);
    const args = splitArgs(inner);
    let text = resolveStr(args[0]);
    const decSep = args[1] ? resolveStr(args[1]) : ".";
    const grpSep = args[2] ? resolveStr(args[2]) : ",";
    text = text.split(grpSep).join("");
    text = text.split(decSep).join(".");
    const n = Number.parseFloat(text);
    return Number.isNaN(n) ? "#VALUE!" : String(n);
  }

  // FIXED(number, decimals, no_commas)
  const fixedM = expr.match(/^FIXED\((.+)\)$/);
  if (fixedM) {
    const args = splitArgs(fixedM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const decimals = args[1] ? Number.parseInt(args[1].trim(), 10) : 2;
    const noCommas = args[2] ? getNumResolved(args[2]) !== 0 : false;
    if (noCommas) return num.toFixed(decimals);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // T(value)
  if (expr.startsWith("T(") && expr.endsWith(")")) {
    const inner = expr.slice(2, -1).trim();
    const val = resolveStr(inner);
    return Number.isNaN(Number(val)) || val === "" ? val : "";
  }

  // UNICODE(text)
  const unicodeM = expr.match(/^UNICODE\((.+)\)$/);
  if (unicodeM) {
    const text = resolveStr(unicodeM[1]);
    return text.length > 0 ? String(text.codePointAt(0)) : "#VALUE!";
  }

  return null;
}
