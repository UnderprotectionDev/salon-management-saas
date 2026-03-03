import {
  getNum,
  getRawValue,
  registerFormula,
  splitTopLevelArgs,
} from "./registry";
import { parseRef } from "../cell-refs";

function resolveNumArg(
  arg: string,
  ctx: import("./registry").FormulaContext,
): number {
  const trimmed = arg.trim();
  if (parseRef(trimmed)) return getNum(trimmed, ctx);
  const n = Number.parseFloat(trimmed);
  return Number.isNaN(n) ? 0 : n;
}

function resolveStrArg(
  arg: string,
  ctx: import("./registry").FormulaContext,
): string {
  const trimmed = arg.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"'))
    return trimmed.slice(1, -1);
  if (parseRef(trimmed)) return getRawValue(trimmed, ctx);
  return trimmed;
}

// TODAY() - returns current date as YYYY-MM-DD
registerFormula("TODAY", () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});

// NOW() - returns current date and time
registerFormula("NOW", () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
});

// DATE(year, month, day) - constructs a date
registerFormula("DATE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const year = resolveNumArg(args[0], ctx);
  const month = resolveNumArg(args[1], ctx);
  const day = resolveNumArg(args[2], ctx);
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});

// YEAR(date)
registerFormula("YEAR", (argsStr, ctx) => {
  const dateStr = resolveStrArg(argsStr, ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  return String(d.getFullYear());
});

// MONTH(date)
registerFormula("MONTH", (argsStr, ctx) => {
  const dateStr = resolveStrArg(argsStr, ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  return String(d.getMonth() + 1);
});

// DAY(date)
registerFormula("DAY", (argsStr, ctx) => {
  const dateStr = resolveStrArg(argsStr, ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  return String(d.getDate());
});

// WEEKDAY(date, [return_type])
registerFormula("WEEKDAY", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 1) return "#ERROR";
  const dateStr = resolveStrArg(args[0], ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  const returnType = args.length > 1 ? resolveNumArg(args[1], ctx) : 1;
  const dow = d.getDay(); // 0=Sun, 6=Sat

  if (returnType === 1) return String(dow + 1); // 1=Sun, 7=Sat
  if (returnType === 2) return String(dow === 0 ? 7 : dow); // 1=Mon, 7=Sun
  if (returnType === 3) return String(dow === 0 ? 6 : dow - 1); // 0=Mon, 6=Sun
  return String(dow + 1);
});

// DATEVALUE(date_text) - parse date string to YYYY-MM-DD
registerFormula("DATEVALUE", (argsStr, ctx) => {
  const dateStr = resolveStrArg(argsStr, ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});

// DATEDIF(start_date, end_date, unit)
registerFormula("DATEDIF", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";
  const startStr = resolveStrArg(args[0], ctx);
  const endStr = resolveStrArg(args[1], ctx);
  const unit = resolveStrArg(args[2], ctx).toUpperCase();

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    return "#ERROR";
  if (startDate > endDate) return "#ERROR";

  if (unit === "D") {
    const diffMs = endDate.getTime() - startDate.getTime();
    return String(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }
  if (unit === "M") {
    return String(
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth()) -
        (endDate.getDate() < startDate.getDate() ? 1 : 0),
    );
  }
  if (unit === "Y") {
    let years = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && endDate.getDate() < startDate.getDate())
    ) {
      years--;
    }
    return String(years);
  }
  if (unit === "MD") {
    let days = endDate.getDate() - startDate.getDate();
    if (days < 0) {
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    return String(days);
  }
  if (unit === "YM") {
    let months = endDate.getMonth() - startDate.getMonth();
    if (months < 0) months += 12;
    if (endDate.getDate() < startDate.getDate()) months--;
    if (months < 0) months += 12;
    return String(months);
  }
  if (unit === "YD") {
    const tempDate = new Date(
      endDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    let diff: number;
    if (tempDate <= endDate) {
      diff = Math.floor(
        (endDate.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      const prevYearDate = new Date(
        endDate.getFullYear() - 1,
        startDate.getMonth(),
        startDate.getDate(),
      );
      diff = Math.floor(
        (endDate.getTime() - prevYearDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    return String(diff);
  }
  return "#ERROR";
});

// EDATE(start_date, months) - date that is N months from start
registerFormula("EDATE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const dateStr = resolveStrArg(args[0], ctx);
  const months = resolveNumArg(args[1], ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  // Preserve end-of-month: if start is last day of month, result should be last day too
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  // If day changed (e.g. Jan 31 + 1 month → Mar 3), clamp to last day of target month
  if (d.getDate() !== originalDay) {
    d.setDate(0); // Set to last day of previous month (the target month)
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});

// EOMONTH(start_date, months) - last day of the month N months from start
registerFormula("EOMONTH", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const dateStr = resolveStrArg(args[0], ctx);
  const months = resolveNumArg(args[1], ctx);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "#ERROR";
  d.setMonth(d.getMonth() + months + 1, 0); // Day 0 = last day of prev month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});
