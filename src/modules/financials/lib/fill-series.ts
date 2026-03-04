/**
 * Fill handle series detection and generation utilities.
 */
import { colLabel } from "./spreadsheet-utils";

type SeriesType = "number" | "copy" | "formula" | "date" | "dayName" | "monthName";

interface DetectedSeries {
  type: SeriesType;
  step: number; // for number/date series (date step in days)
}

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Try to find a value's index in a cyclic name list (case-insensitive) */
function findNameIndex(
  value: string,
  lists: string[][],
): { listIndex: number; index: number } | null {
  const lower = value.trim().toLowerCase();
  for (let li = 0; li < lists.length; li++) {
    const idx = lists[li].findIndex((n) => n.toLowerCase() === lower);
    if (idx !== -1) return { listIndex: li, index: idx };
  }
  return null;
}

/** Try to parse an ISO date (YYYY-MM-DD) */
function tryParseISODate(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Try to parse a Turkish date (DD.MM.YYYY) */
function tryParseTRDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

type DateFormat = "iso" | "tr";

function tryParseDate(value: string): { date: Date; format: DateFormat } | null {
  const iso = tryParseISODate(value);
  if (iso) return { date: iso, format: "iso" };
  const tr = tryParseTRDate(value);
  if (tr) return { date: tr, format: "tr" };
  return null;
}

function formatDate(d: Date, fmt: DateFormat): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return fmt === "iso" ? `${yyyy}-${mm}-${dd}` : `${dd}.${mm}.${yyyy}`;
}

/**
 * Detect the type of series from source values.
 */
export function detectSeries(values: string[]): DetectedSeries {
  if (values.length === 0) return { type: "copy", step: 0 };

  // Check if all values are formulas
  if (values.every((v) => v.startsWith("="))) {
    return { type: "formula", step: 0 };
  }

  // Check day-of-week names (Mon, Tue... or Monday, Tuesday...)
  const dayLists = [DAY_NAMES_SHORT, DAY_NAMES_FULL];
  const dayIndices = values.map((v) => findNameIndex(v, dayLists));
  if (dayIndices.every((d) => d !== null)) {
    return { type: "dayName", step: 1 };
  }

  // Check month names (Jan, Feb... or January, February...)
  const monthLists = [MONTH_NAMES_SHORT, MONTH_NAMES_FULL];
  const monthIndices = values.map((v) => findNameIndex(v, monthLists));
  if (monthIndices.every((m) => m !== null)) {
    return { type: "monthName", step: 1 };
  }

  // Check date values (ISO or Turkish format)
  const dates = values.map((v) => tryParseDate(v));
  if (dates.every((d) => d !== null) && dates.length >= 1) {
    if (dates.length >= 2) {
      const dayMs = 24 * 60 * 60 * 1000;
      const step = Math.round(
        (dates[1].date.getTime() - dates[0].date.getTime()) / dayMs,
      );
      // Check constant step
      const isConstant = dates.every(
        (d, i) =>
          i === 0 ||
          Math.round(
            (d.date.getTime() - dates[i - 1].date.getTime()) / dayMs,
          ) === step,
      );
      if (isConstant) return { type: "date", step };
    }
    return { type: "date", step: 1 };
  }

  // Check if all values are numbers
  const nums = values.map((v) => {
    const cleaned = v
      .replace(/[₺$€%\s]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    return Number.parseFloat(cleaned);
  });

  if (nums.every((n) => !Number.isNaN(n))) {
    if (nums.length >= 2) {
      // Check for constant step
      const step = nums[1] - nums[0];
      const isConstant = nums.every(
        (n, i) => i === 0 || Math.abs(n - nums[i - 1] - step) < 1e-10,
      );
      if (isConstant) {
        return { type: "number", step };
      }
    }
    // Single number or no constant step: just copy
    return { type: "number", step: nums.length >= 2 ? nums[1] - nums[0] : 1 };
  }

  return { type: "copy", step: 0 };
}

/**
 * Generate the next fill value given source values and the target index.
 * targetIndex is 0-based from the end of the source values.
 */
export function generateFillValue(
  sourceValues: string[],
  targetIndex: number,
): string {
  if (sourceValues.length === 0) return "";

  const series = detectSeries(sourceValues);

  if (series.type === "dayName") {
    const dayLists = [DAY_NAMES_SHORT, DAY_NAMES_FULL];
    const lastInfo = findNameIndex(
      sourceValues[sourceValues.length - 1],
      dayLists,
    );
    if (lastInfo) {
      const list = dayLists[lastInfo.listIndex];
      const nextIdx = (lastInfo.index + targetIndex + 1) % list.length;
      return list[nextIdx];
    }
  }

  if (series.type === "monthName") {
    const monthLists = [MONTH_NAMES_SHORT, MONTH_NAMES_FULL];
    const lastInfo = findNameIndex(
      sourceValues[sourceValues.length - 1],
      monthLists,
    );
    if (lastInfo) {
      const list = monthLists[lastInfo.listIndex];
      const nextIdx = (lastInfo.index + targetIndex + 1) % list.length;
      return list[nextIdx];
    }
  }

  if (series.type === "date") {
    const lastParsed = tryParseDate(sourceValues[sourceValues.length - 1]);
    if (lastParsed) {
      const result = new Date(lastParsed.date);
      result.setDate(result.getDate() + series.step * (targetIndex + 1));
      return formatDate(result, lastParsed.format);
    }
  }

  if (series.type === "number") {
    const nums = sourceValues.map((v) => {
      const cleaned = v
        .replace(/[₺$€%\s]/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      return Number.parseFloat(cleaned);
    });
    const last = nums[nums.length - 1];
    const result = last + series.step * (targetIndex + 1);
    return String(Number.parseFloat(result.toFixed(10)));
  }

  if (series.type === "formula") {
    // For formulas, return the source value (caller handles ref adjustment)
    return sourceValues[targetIndex % sourceValues.length];
  }

  // Copy: cycle through source values
  return sourceValues[targetIndex % sourceValues.length];
}

/**
 * Adjust relative references in a formula by row/col delta.
 * $ prefix marks absolute references (not adjusted).
 */
export function adjustFormulaRefs(
  formula: string,
  rowDelta: number,
  colDelta: number,
): string {
  if (!formula.startsWith("=")) return formula;
  return (
    "=" +
    formula
      .slice(1)
      .replace(
        /(\$?)([A-Z]{1,3})(\$?)(\d{1,5})/g,
        (
          _match,
          colDollar: string,
          colStr: string,
          rowDollar: string,
          rowStr: string,
        ) => {
          // Adjust column if not absolute
          let newColStr = colStr;
          if (colDollar !== "$" && colDelta !== 0) {
            let col = 0;
            for (const ch of colStr) col = col * 26 + ch.charCodeAt(0) - 64;
            col = col - 1 + colDelta;
            if (col < 0) return "#REF!";
            newColStr = colLabel(col);
          }

          // Adjust row if not absolute
          let newRowStr = rowStr;
          if (rowDollar !== "$" && rowDelta !== 0) {
            const row = Number.parseInt(rowStr, 10) - 1 + rowDelta;
            if (row < 0) return "#REF!";
            newRowStr = String(row + 1);
          }

          return `${colDollar}${newColStr}${rowDollar}${newRowStr}`;
        },
      )
  );
}
