import type { EvalContext } from "./types";

/**
 * Date/Time functions: TODAY, NOW, DATE, YEAR, MONTH, MINUTE, DAYS, DAY,
 * HOUR, SECOND, TIME, WEEKDAY, WEEKNUM, WORKDAY, DATEVALUE, TIMEVALUE,
 * YEARFRAC, DAYS360
 */
export function evalDateTime(expr: string, ctx: EvalContext): string | null {
  const { splitArgs, resolveStr, getNumResolved } = ctx;

  // TODAY()
  if (expr === "TODAY()") {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // NOW()
  if (expr === "NOW()") {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // DATE(year, month, day)
  const dateM = expr.match(/^DATE\((.+)\)$/);
  if (dateM) {
    const args = splitArgs(dateM[1]);
    const y = args[0]
      ? Number.parseInt(args[0].trim(), 10)
      : new Date().getFullYear();
    const m = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    const day = args[2] ? Number.parseInt(args[2].trim(), 10) : 1;
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day))
      return "#VALUE!";
    const d = new Date(y, m - 1, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // YEAR(date_string)
  const yearM = expr.match(/^YEAR\((.+)\)$/);
  if (yearM) {
    const val = resolveStr(yearM[1]);
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "#ERROR" : String(d.getFullYear());
  }

  // MONTH(date_string) — must come before MINUTE to avoid prefix collision
  if (expr.startsWith("MONTH(") && expr.endsWith(")")) {
    const inner = expr.slice(6, -1);
    const val = resolveStr(inner);
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "#ERROR" : String(d.getMonth() + 1);
  }

  // MINUTE(time)
  if (expr.startsWith("MINUTE(") && expr.endsWith(")")) {
    const inner = expr.slice(7, -1);
    const val = resolveStr(inner);
    // Try parsing as time "HH:MM" or "HH:MM:SS"
    const timeM = val.match(/(\d{1,2}):(\d{2})/);
    if (timeM) return String(Number.parseInt(timeM[2], 10));
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "#ERROR" : String(d.getMinutes());
  }

  // DAYS(start_date, end_date) — must come before DAY to avoid prefix collision
  if (expr.startsWith("DAYS(") && expr.endsWith(")")) {
    const inner = expr.slice(5, -1);
    const args = splitArgs(inner);
    if (args.length < 2) return "#VALUE!";
    if (args.length >= 2) {
      const d1 = new Date(resolveStr(args[0]));
      const d2 = new Date(resolveStr(args[1]));
      if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()))
        return "#VALUE!";
      return String(
        Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }
  }

  // DAY(date_string)
  const dayM = expr.match(/^DAY\((.+)\)$/);
  if (dayM) {
    const val = resolveStr(dayM[1]);
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "#ERROR" : String(d.getDate());
  }

  // HOUR(time)
  const hourM = expr.match(/^HOUR\((.+)\)$/);
  if (hourM) {
    const val = resolveStr(hourM[1]);
    const timeMatch = val.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) return String(Number.parseInt(timeMatch[1], 10));
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "#ERROR" : String(d.getHours());
  }

  // SECOND(time)
  const secM = expr.match(/^SECOND\((.+)\)$/);
  if (secM) {
    const val = resolveStr(secM[1]);
    const timeMatch = val.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (timeMatch) return String(Number.parseInt(timeMatch[3], 10));
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "#ERROR" : String(d.getSeconds());
  }

  // TIME(hour, minute, second)
  const timeM = expr.match(/^TIME\((.+)\)$/);
  if (timeM) {
    const args = splitArgs(timeM[1]);
    let h = args[0] ? Number.parseInt(args[0].trim(), 10) : 0;
    let m = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    let s = args[2] ? Number.parseInt(args[2].trim(), 10) : 0;
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return "#VALUE!";
    m += Math.floor(s / 60);
    s = s % 60;
    h += Math.floor(m / 60);
    m = m % 60;
    h = h % 24;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // WEEKDAY(date, return_type)
  if (expr.startsWith("WEEKDAY(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    const d = new Date(resolveStr(args[0]));
    if (Number.isNaN(d.getTime())) return "#VALUE!";
    const returnType = args[1] ? Number.parseInt(args[1].trim(), 10) : 1;
    const dow = d.getDay(); // 0=Sun
    if (returnType === 1) return String(dow + 1); // 1=Sun..7=Sat
    if (returnType === 2) return String(dow === 0 ? 7 : dow); // 1=Mon..7=Sun
    if (returnType === 3) return String(dow === 0 ? 6 : dow - 1); // 0=Mon..6=Sun
    return String(dow + 1);
  }

  // WEEKNUM(date)
  if (expr.startsWith("WEEKNUM(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const d = new Date(resolveStr(inner));
    if (Number.isNaN(d.getTime())) return "#VALUE!";
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor(
      (d.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    );
    return String(Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7));
  }

  // WORKDAY(start_date, days)
  if (expr.startsWith("WORKDAY(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    const d = new Date(resolveStr(args[0]));
    let daysToAdd = args[1] ? Number.parseInt(args[1].trim(), 10) : 0;
    if (Number.isNaN(d.getTime())) return "#VALUE!";
    const direction = daysToAdd >= 0 ? 1 : -1;
    daysToAdd = Math.abs(daysToAdd);
    let added = 0;
    while (added < daysToAdd) {
      d.setDate(d.getDate() + direction);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // DATEVALUE(date_text)
  if (expr.startsWith("DATEVALUE(") && expr.endsWith(")")) {
    const inner = expr.slice(10, -1);
    const val = resolveStr(inner);
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "#VALUE!";
    // Return days since Unix epoch
    return String(Math.floor(d.getTime() / (1000 * 60 * 60 * 24)));
  }

  // TIMEVALUE(time_text)
  if (expr.startsWith("TIMEVALUE(") && expr.endsWith(")")) {
    const inner = expr.slice(10, -1);
    const val = resolveStr(inner);
    const timeMatch = val.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!timeMatch) return "#VALUE!";
    const h = Number.parseInt(timeMatch[1], 10);
    const m = Number.parseInt(timeMatch[2], 10);
    const s = timeMatch[3] ? Number.parseInt(timeMatch[3], 10) : 0;
    return String(
      Math.round(((h * 3600 + m * 60 + s) / 86400) * 100000) / 100000,
    );
  }

  // YEARFRAC(start_date, end_date)
  if (expr.startsWith("YEARFRAC(") && expr.endsWith(")")) {
    const inner = expr.slice(9, -1);
    const args = splitArgs(inner);
    const d1 = new Date(resolveStr(args[0]));
    const d2 = new Date(resolveStr(args[1] ?? ""));
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()))
      return "#VALUE!";
    const days = Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return String(Math.round((days / 365.25) * 100000) / 100000);
  }

  // DAYS360(start_date, end_date, method)
  if (expr.startsWith("DAYS360(") && expr.endsWith(")")) {
    const inner = expr.slice(8, -1);
    const args = splitArgs(inner);
    const d1 = new Date(resolveStr(args[0]));
    const d2 = new Date(resolveStr(args[1] ?? ""));
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()))
      return "#VALUE!";
    const european = args[2] ? getNumResolved(args[2]) !== 0 : false;
    let d1Day = d1.getDate();
    const d1Month = d1.getMonth() + 1;
    const d1Year = d1.getFullYear();
    let d2Day = d2.getDate();
    const d2Month = d2.getMonth() + 1;
    const d2Year = d2.getFullYear();
    if (european) {
      if (d1Day === 31) d1Day = 30;
      if (d2Day === 31) d2Day = 30;
    } else {
      if (d1Day === 31) d1Day = 30;
      if (d2Day === 31 && d1Day === 30) d2Day = 30;
    }
    return String(
      (d2Year - d1Year) * 360 + (d2Month - d1Month) * 30 + (d2Day - d1Day),
    );
  }

  return null;
}
