import type { EvalContext } from "./types";

/**
 * Logical functions (AND, OR, NOT, XOR, IFS, ISBLANK, ISNUMBER, ISTEXT,
 * IFNA, ISERROR, ISNA, TYPE) + Lookup/Reference (VLOOKUP, HLOOKUP, INDEX,
 * MATCH, OFFSET, INDIRECT, ROWS, ROW, COLUMNS, COLUMN) + IFERROR, IF,
 * CHOOSE, SWITCH, SUMPRODUCT + misc (POWER, MOD, ROUNDUP, ROUNDDOWN,
 * SQRT, LOG, LOG10, MEDIAN, STDEV, VAR, PERCENTILE, LARGE, SMALL, FIND,
 * SUBSTITUTE, PROPER, REPT, VALUE, TEXT, DATEDIF, NETWORKDAYS, EDATE, EOMONTH)
 */
export function evalLogicalLookup(
  expr: string,
  ctx: EvalContext,
): string | null {
  const {
    splitArgs,
    resolveStr,
    resolveArgs,
    getNumResolved,
    getNum,
    evalCondition,
    expandRange,
    parseRef,
    colToStr,
    cells,
    evalFormula,
    depth,
    customFormulas,
  } = ctx;

  // AND(cond1, cond2, ...)
  if (expr.startsWith("AND(") && expr.endsWith(")")) {
    const inner = expr.slice(4, -1);
    const args = splitArgs(inner);
    const result = args.every((a) => evalCondition(a.trim()));
    return result ? "TRUE" : "FALSE";
  }

  // OR(cond1, cond2, ...)
  if (expr.startsWith("OR(") && expr.endsWith(")")) {
    const inner = expr.slice(3, -1);
    const args = splitArgs(inner);
    const result = args.some((a) => evalCondition(a.trim()));
    return result ? "TRUE" : "FALSE";
  }

  // NOT(condition)
  if (expr.startsWith("NOT(") && expr.endsWith(")")) {
    const inner = expr.slice(4, -1).trim();
    return evalCondition(inner) ? "FALSE" : "TRUE";
  }

  // XOR(cond1, cond2, ...)
  if (expr.startsWith("XOR(") && expr.endsWith(")")) {
    const inner = expr.slice(4, -1);
    const args = splitArgs(inner);
    const trueCount = args.filter((a) => evalCondition(a.trim())).length;
    return trueCount % 2 === 1 ? "TRUE" : "FALSE";
  }

  // IFS(cond1, val1, cond2, val2, ...)
  if (expr.startsWith("IFS(") && expr.endsWith(")")) {
    const inner = expr.slice(4, -1);
    const args = splitArgs(inner);
    for (let i = 0; i + 1 < args.length; i += 2) {
      if (evalCondition(args[i].trim())) {
        return resolveStr(args[i + 1]);
      }
    }
    return "#N/A";
  }

  // ISBLANK(value)
  if (expr.startsWith("ISBLANK(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1).trim();
    const coord = parseRef(inner);
    if (coord) {
      const val = cells[inner]?.value ?? "";
      return val === "" ? "TRUE" : "FALSE";
    }
    return inner === "" ? "TRUE" : "FALSE";
  }

  // ISNUMBER(value)
  if (expr.startsWith("ISNUMBER(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1).trim();
    const val = resolveStr(inner);
    return !Number.isNaN(Number(val)) && val !== "" ? "TRUE" : "FALSE";
  }

  // ISTEXT(value)
  if (expr.startsWith("ISTEXT(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1).trim();
    const val = resolveStr(inner);
    return Number.isNaN(Number(val)) || val === "" ? "TRUE" : "FALSE";
  }

  // IFNA(value, value_if_na)
  if (expr.startsWith("IFNA(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      try {
        const result = evalFormula(
          `=${args[0].trim()}`,
          cells,
          depth + 1,
          customFormulas,
        );
        if (result === "#N/A") return resolveStr(args[1]);
        return result;
      } catch {
        return resolveStr(args[1]);
      }
    }
  }

  // ISERROR(value)
  if (expr.startsWith("ISERROR(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1).trim();
    try {
      const result = evalFormula(`=${inner}`, cells, depth + 1, customFormulas);
      return result.startsWith("#") ? "TRUE" : "FALSE";
    } catch {
      return "TRUE";
    }
  }

  // ISNA(value)
  if (expr.startsWith("ISNA(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1).trim();
    try {
      const result = evalFormula(`=${inner}`, cells, depth + 1, customFormulas);
      return result === "#N/A" ? "TRUE" : "FALSE";
    } catch {
      return "FALSE";
    }
  }

  // TYPE(value)
  if (expr.startsWith("TYPE(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1).trim();
    const val = resolveStr(inner);
    if (val === "TRUE" || val === "FALSE") return "4";
    if (val.startsWith("#")) return "16";
    if (val !== "" && !Number.isNaN(Number(val))) return "1";
    return "2";
  }

  // VLOOKUP(value, range, col_index, exact_match)
  if (expr.startsWith("VLOOKUP(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const lookupVal = resolveStr(args[0]);
      const rangeStr = args[1].trim();
      const colIdx = Number.parseInt(args[2].trim(), 10);

      const rangeParts = rangeStr.split(":");
      if (rangeParts.length === 2) {
        const startP = parseRef(rangeParts[0]);
        const endP = parseRef(rangeParts[1]);
        if (startP && endP) {
          for (let r = startP.row; r <= endP.row; r++) {
            const cellVal = resolveStr(`${colToStr(startP.col)}${r + 1}`);
            if (
              cellVal === lookupVal ||
              (Number(cellVal) === Number(lookupVal) &&
                !Number.isNaN(Number(lookupVal)))
            ) {
              const targetCol = startP.col + colIdx - 1;
              return resolveStr(`${colToStr(targetCol)}${r + 1}`);
            }
          }
          return "#N/A";
        }
      }
    }
  }

  // IFERROR(value, value_if_error) — must come BEFORE IF to avoid prefix collision
  if (expr.startsWith("IFERROR(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      try {
        const result = evalFormula(
          `=${args[0].trim()}`,
          cells,
          depth + 1,
          customFormulas,
        );
        if (
          result === "#ERROR" ||
          result === "#CIRCULAR" ||
          result === "#DIV/0!" ||
          result === "#N/A" ||
          result === "#VALUE!" ||
          result === "#NUM!"
        ) {
          return resolveStr(args[1]);
        }
        return result;
      } catch {
        return resolveStr(args[1]);
      }
    }
  }

  // IF(condition, true_val, false_val)
  if (expr.startsWith("IF(") && expr.endsWith(")")) {
    const inner = expr.slice(3, -1);
    const parts = splitArgs(inner);
    if (parts.length === 3) {
      const cond = parts[0].trim();
      const trueVal = parts[1].trim();
      const falseVal = parts[2].trim();
      return evalCondition(cond)
        ? trueVal.replace(/^"(.*)"$/, "$1")
        : falseVal.replace(/^"(.*)"$/, "$1");
    }
  }

  // CHOOSE(index, value1, value2, ...)
  if (expr.startsWith("CHOOSE(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const idx = Number.parseInt(resolveStr(args[0]), 10);
      if (idx >= 1 && idx < args.length) {
        return resolveStr(args[idx]);
      }
      return "#N/A";
    }
  }

  // SWITCH(expression, case1, value1, ..., default)
  if (expr.startsWith("SWITCH(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const target = resolveStr(args[0]);
      for (let i = 1; i + 1 < args.length; i += 2) {
        if (resolveStr(args[i]) === target) {
          return resolveStr(args[i + 1]);
        }
      }
      if (args.length % 2 === 0) {
        return resolveStr(args[args.length - 1]);
      }
      return "#N/A";
    }
  }

  // SUMPRODUCT(range1, range2)
  const spM = expr.match(/^SUMPRODUCT\((.+)\)$/);
  if (spM) {
    const args = splitArgs(spM[1]);
    if (args.length >= 2) {
      const r1 = args[0].trim().includes(":")
        ? expandRange(args[0].trim())
        : [args[0].trim()];
      const r2 = args[1].trim().includes(":")
        ? expandRange(args[1].trim())
        : [args[1].trim()];
      let sum = 0;
      const len = Math.min(r1.length, r2.length);
      for (let i = 0; i < len; i++) {
        sum += getNum(r1[i]) * getNum(r2[i]);
      }
      return String(sum);
    }
  }

  // POWER(number, power)
  const powM = expr.match(/^POWER\((.+)\)$/);
  if (powM) {
    const args = splitArgs(powM[1]);
    const base = args[0] ? getNumResolved(args[0]) : 0;
    const exp = args[1] ? getNumResolved(args[1]) : 0;
    return String(base ** exp);
  }

  // MOD(number, divisor)
  const modM = expr.match(/^MOD\((.+)\)$/);
  if (modM) {
    const args = splitArgs(modM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const div = args[1] ? getNumResolved(args[1]) : 0;
    if (div === 0) return "#DIV/0!";
    return String(num % div);
  }

  // ROUNDUP(number, digits)
  const ruM = expr.match(/^ROUNDUP\((.+)\)$/);
  if (ruM) {
    const args = splitArgs(ruM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const digits = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    const factor = 10 ** digits;
    return String(
      num >= 0
        ? Math.ceil(num * factor) / factor
        : -Math.ceil(Math.abs(num) * factor) / factor,
    );
  }

  // ROUNDDOWN(number, digits)
  const rdM = expr.match(/^ROUNDDOWN\((.+)\)$/);
  if (rdM) {
    const args = splitArgs(rdM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const digits = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    const factor = 10 ** digits;
    return String(Math.trunc(num * factor) / factor);
  }

  // SQRT(number)
  const sqrtM = expr.match(/^SQRT\((.+)\)$/);
  if (sqrtM) {
    const num = getNumResolved(sqrtM[1]);
    if (num < 0) return "#ERROR";
    return String(Math.sqrt(num));
  }

  // LOG(number, base)
  const logM = expr.match(/^LOG\((.+)\)$/);
  if (logM) {
    const args = splitArgs(logM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const base = args[1] ? getNumResolved(args[1]) : 10;
    if (num <= 0 || base <= 0 || base === 1) return "#ERROR";
    return String(Math.log(num) / Math.log(base));
  }

  // LOG10(number)
  const log10M = expr.match(/^LOG10\((.+)\)$/);
  if (log10M) {
    const num = getNumResolved(log10M[1]);
    if (num <= 0) return "#ERROR";
    return String(Math.log10(num));
  }

  // MEDIAN(range)
  const medM = expr.match(/^MEDIAN\((.+)\)$/);
  if (medM) {
    const vals = resolveArgs(medM[1]).sort((a, b) => a - b);
    if (vals.length === 0) return "0";
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 !== 0
      ? String(vals[mid])
      : String((vals[mid - 1] + vals[mid]) / 2);
  }

  // STDEV(range)
  const stdevM = expr.match(/^STDEV\((.+)\)$/);
  if (stdevM) {
    const vals = resolveArgs(stdevM[1]);
    if (vals.length < 2) return "#DIV/0!";
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
    return String(Math.sqrt(variance));
  }

  // VAR(range)
  const varM = expr.match(/^VAR\((.+)\)$/);
  if (varM) {
    const vals = resolveArgs(varM[1]);
    if (vals.length < 2) return "#DIV/0!";
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return String(
      vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1),
    );
  }

  // PERCENTILE(range, k)
  const percM = expr.match(/^PERCENTILE\((.+)\)$/);
  if (percM) {
    const args = splitArgs(percM[1]);
    const rangeStr = args[0]?.trim() ?? "";
    const k = args[1] ? getNumResolved(args[1]) : 0;
    if (k < 0 || k > 1) return "#ERROR";
    const vals = (
      rangeStr.includes(":")
        ? expandRange(rangeStr).map((r) => getNum(r))
        : [getNum(rangeStr)]
    ).sort((a, b) => a - b);
    if (vals.length === 0) return "0";
    const rank = k * (vals.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return String(vals[lower]);
    const frac = rank - lower;
    return String(vals[lower] + frac * (vals[upper] - vals[lower]));
  }

  // LARGE(range, k)
  const largeM = expr.match(/^LARGE\((.+)\)$/);
  if (largeM) {
    const args = splitArgs(largeM[1]);
    const rangeStr = args[0]?.trim() ?? "";
    const k = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    const vals = (
      rangeStr.includes(":")
        ? expandRange(rangeStr).map((r) => getNum(r))
        : [getNum(rangeStr)]
    ).sort((a, b) => b - a);
    if (k < 1 || k > vals.length) return "#N/A";
    return String(vals[k - 1]);
  }

  // SMALL(range, k)
  const smallM = expr.match(/^SMALL\((.+)\)$/);
  if (smallM) {
    const args = splitArgs(smallM[1]);
    const rangeStr = args[0]?.trim() ?? "";
    const k = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    const vals = (
      rangeStr.includes(":")
        ? expandRange(rangeStr).map((r) => getNum(r))
        : [getNum(rangeStr)]
    ).sort((a, b) => a - b);
    if (k < 1 || k > vals.length) return "#N/A";
    return String(vals[k - 1]);
  }

  // FIND(find_text, within_text, start)
  const findM = expr.match(/^FIND\((.+)\)$/);
  if (findM) {
    const args = splitArgs(findM[1]);
    const needle = resolveStr(args[0]);
    const haystack = resolveStr(args[1] ?? "");
    const start = args[2] ? Number.parseInt(args[2].trim(), 10) - 1 : 0;
    const idx = haystack.indexOf(needle, start);
    return idx === -1 ? "#VALUE!" : String(idx + 1);
  }

  // SUBSTITUTE(text, old_text, new_text)
  if (expr.startsWith("SUBSTITUTE(") && expr.endsWith(")")) {
    const inner = expr.slice(11, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const text = resolveStr(args[0]);
      const oldT = resolveStr(args[1]);
      const newT = resolveStr(args[2]);
      return text.split(oldT).join(newT);
    }
  }

  // PROPER(text)
  const properM = expr.match(/^PROPER\((.+)\)$/);
  if (properM) {
    const text = resolveStr(properM[1]);
    return text.replace(
      /\w\S*/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    );
  }

  // REPT(text, number)
  const reptM = expr.match(/^REPT\((.+)\)$/);
  if (reptM) {
    const args = splitArgs(reptM[1]);
    const text = resolveStr(args[0]);
    const n = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    return text.repeat(Math.max(0, n));
  }

  // VALUE(text)
  const valueM = expr.match(/^VALUE\((.+)\)$/);
  if (valueM) {
    const text = resolveStr(valueM[1])
      .replace(/[₺$€%\s]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const n = Number.parseFloat(text);
    return Number.isNaN(n) ? "#VALUE!" : String(n);
  }

  // TEXT(value, format)
  const textM = expr.match(/^TEXT\((.+)\)$/);
  if (textM) {
    const args = splitArgs(textM[1]);
    const num = args[0] ? getNumResolved(args[0]) : 0;
    const fmt = args[1] ? resolveStr(args[1]).toUpperCase() : "";
    if (fmt === "0%" || fmt === "0.0%") {
      const decimals = fmt === "0.0%" ? 1 : 0;
      return `${(num * 100).toFixed(decimals)}%`;
    }
    if (fmt === "#,##0.00") {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (fmt === "#,##0") {
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    if (fmt === "0.00") return num.toFixed(2);
    if (fmt === "YYYY-MM-DD") {
      const d = new Date(num);
      if (Number.isNaN(d.getTime())) return String(num);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return String(num);
  }

  // DATEDIF(start_date, end_date, unit)
  if (expr.startsWith("DATEDIF(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const d1 = new Date(resolveStr(args[0]));
      const d2 = new Date(resolveStr(args[1]));
      const unit = resolveStr(args[2]).toUpperCase();
      if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()))
        return "#VALUE!";
      if (unit === "D") {
        return String(
          Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)),
        );
      }
      if (unit === "M") {
        return String(
          (d2.getFullYear() - d1.getFullYear()) * 12 +
            d2.getMonth() -
            d1.getMonth(),
        );
      }
      if (unit === "Y") {
        return String(d2.getFullYear() - d1.getFullYear());
      }
      return "#ERROR";
    }
  }

  // NETWORKDAYS(start_date, end_date)
  if (expr.startsWith("NETWORKDAYS(") && expr.endsWith(")")) {
    const inner = expr.slice(12, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const d1 = new Date(resolveStr(args[0]));
      const d2 = new Date(resolveStr(args[1]));
      if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()))
        return "#VALUE!";
      let count = 0;
      const current = new Date(d1);
      while (current <= d2) {
        const dow = current.getDay();
        if (dow !== 0 && dow !== 6) count++;
        current.setDate(current.getDate() + 1);
      }
      return String(count);
    }
  }

  // EDATE(start_date, months)
  const edateM = expr.match(/^EDATE\((.+)\)$/);
  if (edateM) {
    const args = splitArgs(edateM[1]);
    const d = new Date(resolveStr(args[0]));
    const months = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    if (Number.isNaN(d.getTime())) return "#VALUE!";
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // EOMONTH(start_date, months)
  const eomonthM = expr.match(/^EOMONTH\((.+)\)$/);
  if (eomonthM) {
    const args = splitArgs(eomonthM[1]);
    const d = new Date(resolveStr(args[0]));
    const months = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    if (Number.isNaN(d.getTime())) return "#VALUE!";
    d.setMonth(d.getMonth() + months + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // HLOOKUP(value, range, row_index, exact_match)
  if (expr.startsWith("HLOOKUP(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const lookupVal = resolveStr(args[0]);
      const rangeStr = args[1].trim();
      const rowIdx = Number.parseInt(args[2].trim(), 10);
      const rangeParts = rangeStr.split(":");
      if (rangeParts.length === 2) {
        const startP = parseRef(rangeParts[0]);
        const endP = parseRef(rangeParts[1]);
        if (startP && endP) {
          for (let c = startP.col; c <= endP.col; c++) {
            const cellVal = resolveStr(`${colToStr(c)}${startP.row + 1}`);
            if (
              cellVal === lookupVal ||
              (Number(cellVal) === Number(lookupVal) &&
                !Number.isNaN(Number(lookupVal)))
            ) {
              const targetRow = startP.row + rowIdx - 1;
              return resolveStr(`${colToStr(c)}${targetRow + 1}`);
            }
          }
          return "#N/A";
        }
      }
    }
  }

  // INDEX(range, row_num, col_num)
  if (expr.startsWith("INDEX(") && expr.endsWith(")")) {
    const inner = expr.slice(6, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const rangeStr = args[0].trim();
      const rowNum = Number.parseInt(args[1].trim(), 10);
      const colNum = args[2] ? Number.parseInt(args[2].trim(), 10) : 1;
      const rangeParts = rangeStr.split(":");
      if (rangeParts.length === 2) {
        const startP = parseRef(rangeParts[0]);
        if (startP) {
          const targetRow = startP.row + rowNum - 1;
          const targetCol = startP.col + colNum - 1;
          return resolveStr(`${colToStr(targetCol)}${targetRow + 1}`);
        }
      }
    }
  }

  // MATCH(value, range, match_type)
  if (expr.startsWith("MATCH(") && expr.endsWith(")")) {
    const inner = expr.slice(6, -1);
    const args = splitArgs(inner);
    if (args.length >= 2) {
      const lookupVal = resolveStr(args[0]);
      const rangeStr = args[1].trim();
      const refs = rangeStr.includes(":") ? expandRange(rangeStr) : [rangeStr];
      for (let i = 0; i < refs.length; i++) {
        const cellVal = resolveStr(refs[i]);
        if (
          cellVal === lookupVal ||
          (Number(cellVal) === Number(lookupVal) &&
            !Number.isNaN(Number(lookupVal)))
        ) {
          return String(i + 1);
        }
      }
      return "#N/A";
    }
  }

  // OFFSET(reference, rows, cols)
  if (expr.startsWith("OFFSET(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1);
    const args = splitArgs(inner);
    if (args.length >= 3) {
      const ref = parseRef(args[0].trim());
      if (ref) {
        const rows = Number.parseInt(args[1].trim(), 10);
        const cols = Number.parseInt(args[2].trim(), 10);
        const newRow = ref.row + rows;
        const newCol = ref.col + cols;
        if (newRow < 0 || newCol < 0) return "#REF!";
        return resolveStr(`${colToStr(newCol)}${newRow + 1}`);
      }
    }
  }

  // INDIRECT(ref_text)
  if (expr.startsWith("INDIRECT(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const refStr = resolveStr(inner);
    const coord = parseRef(refStr);
    if (coord) return resolveStr(refStr);
    return "#REF!";
  }

  // ROWS(range) — must come before ROW
  if (expr.startsWith("ROWS(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1).trim();
    const parts = inner.split(":");
    if (parts.length === 2) {
      const s = parseRef(parts[0]);
      const e = parseRef(parts[1]);
      if (s && e) return String(Math.abs(e.row - s.row) + 1);
    }
    return "1";
  }

  // ROW(reference)
  if (expr.startsWith("ROW(") && expr.endsWith(")")) {
    const inner = expr.slice(4, -1).trim();
    const ref = parseRef(inner);
    return ref ? String(ref.row + 1) : "#REF!";
  }

  // COLUMNS(range) — must come before COLUMN
  if (expr.startsWith("COLUMNS(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1).trim();
    const parts = inner.split(":");
    if (parts.length === 2) {
      const s = parseRef(parts[0]);
      const e = parseRef(parts[1]);
      if (s && e) return String(Math.abs(e.col - s.col) + 1);
    }
    return "1";
  }

  // COLUMN(reference)
  if (expr.startsWith("COLUMN(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1).trim();
    const ref = parseRef(inner);
    return ref ? String(ref.col + 1) : "#REF!";
  }

  return null;
}
