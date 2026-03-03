import type { CellMap } from "./spreadsheet-types";
import type {
  CellConditionalStyle,
  CondFormatRule,
} from "./conditional-format-types";
import { expandRange, parseRef } from "./cell-refs";
import { evalFormula } from "./spreadsheet-formula";

/** Interpolate between two hex colors */
function interpolateColor(
  color1: string,
  color2: string,
  factor: number,
): string {
  const r1 = Number.parseInt(color1.slice(1, 3), 16);
  const g1 = Number.parseInt(color1.slice(3, 5), 16);
  const b1 = Number.parseInt(color1.slice(5, 7), 16);
  const r2 = Number.parseInt(color2.slice(1, 3), 16);
  const g2 = Number.parseInt(color2.slice(3, 5), 16);
  const b2 = Number.parseInt(color2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Get numeric values from a range */
function getRangeValues(range: string, cells: CellMap): number[] {
  const refs = expandRange(range);
  const values: number[] = [];
  for (const ref of refs) {
    const val = cells[ref]?.value ?? "";
    const resolved = val.startsWith("=") ? evalFormula(val, cells) : val;
    const num = Number.parseFloat(resolved);
    if (!Number.isNaN(num)) values.push(num);
  }
  return values;
}

/** Check if a cell ref is within a range string */
function isCellInRange(cellRefStr: string, rangeStr: string): boolean {
  const refs = expandRange(rangeStr);
  return refs.includes(cellRefStr);
}

/** Evaluate a value-based condition */
function matchesValueCondition(
  cellValue: string,
  rule: CondFormatRule,
): boolean {
  const num = Number.parseFloat(cellValue);
  const v1 = Number.parseFloat(rule.value1 ?? "");
  const v2 = Number.parseFloat(rule.value2 ?? "");

  switch (rule.operator) {
    case "greaterThan":
      return !Number.isNaN(num) && !Number.isNaN(v1) && num > v1;
    case "lessThan":
      return !Number.isNaN(num) && !Number.isNaN(v1) && num < v1;
    case "equal":
      return !Number.isNaN(num) && !Number.isNaN(v1)
        ? num === v1
        : cellValue === (rule.value1 ?? "");
    case "notEqual":
      return !Number.isNaN(num) && !Number.isNaN(v1)
        ? num !== v1
        : cellValue !== (rule.value1 ?? "");
    case "greaterThanOrEqual":
      return !Number.isNaN(num) && !Number.isNaN(v1) && num >= v1;
    case "lessThanOrEqual":
      return !Number.isNaN(num) && !Number.isNaN(v1) && num <= v1;
    case "between":
      return (
        !Number.isNaN(num) &&
        !Number.isNaN(v1) &&
        !Number.isNaN(v2) &&
        num >= v1 &&
        num <= v2
      );
    case "notBetween":
      return (
        !Number.isNaN(num) &&
        !Number.isNaN(v1) &&
        !Number.isNaN(v2) &&
        (num < v1 || num > v2)
      );
    case "contains":
      return cellValue.includes(rule.value1 ?? "");
    case "notContains":
      return !cellValue.includes(rule.value1 ?? "");
    case "beginsWith":
      return cellValue.startsWith(rule.value1 ?? "");
    case "endsWith":
      return cellValue.endsWith(rule.value1 ?? "");
    default:
      return false;
  }
}

/**
 * Evaluate all conditional formatting rules for a given cell
 * and return the resolved style.
 */
export function evaluateConditionalFormats(
  cellRefStr: string,
  cellValue: string,
  rules: CondFormatRule[],
  cells: CellMap,
): CellConditionalStyle | null {
  if (rules.length === 0) return null;

  // Sort by priority (lower = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    // Check if cell is in the rule's range
    if (!isCellInRange(cellRefStr, rule.range)) continue;

    const resolved = cellValue.startsWith("=")
      ? evalFormula(cellValue, cells)
      : cellValue;

    switch (rule.type) {
      case "value": {
        if (matchesValueCondition(resolved, rule) && rule.format) {
          return {
            bgColor: rule.format.bgColor,
            textColor: rule.format.textColor,
            bold: rule.format.bold,
            italic: rule.format.italic,
          };
        }
        break;
      }

      case "colorScale": {
        if (!rule.colorScale) break;
        const num = Number.parseFloat(resolved);
        if (Number.isNaN(num)) break;

        const values = getRangeValues(rule.range, cells);
        if (values.length === 0) break;

        const min = Math.min(...values);
        const max = Math.max(...values);
        if (min === max) break;

        const factor = (num - min) / (max - min);

        if (rule.colorScale.midColor) {
          const bg =
            factor < 0.5
              ? interpolateColor(
                  rule.colorScale.minColor,
                  rule.colorScale.midColor,
                  factor * 2,
                )
              : interpolateColor(
                  rule.colorScale.midColor,
                  rule.colorScale.maxColor,
                  (factor - 0.5) * 2,
                );
          return { bgColor: bg };
        }

        return {
          bgColor: interpolateColor(
            rule.colorScale.minColor,
            rule.colorScale.maxColor,
            factor,
          ),
        };
      }

      case "dataBar": {
        if (!rule.dataBar) break;
        const num = Number.parseFloat(resolved);
        if (Number.isNaN(num)) break;

        const values = getRangeValues(rule.range, cells);
        if (values.length === 0) break;

        const min = Math.min(...values, 0);
        const max = Math.max(...values);
        if (max === min) break;

        const percent = Math.max(
          0,
          Math.min(100, ((num - min) / (max - min)) * 100),
        );
        return {
          dataBarPercent: percent,
          dataBarColor: rule.dataBar.color,
        };
      }

      case "formula": {
        if (!rule.formula) break;
        const result = evalFormula(`=${rule.formula}`, cells);
        if ((result === "TRUE" || result === "1") && rule.format) {
          return {
            bgColor: rule.format.bgColor,
            textColor: rule.format.textColor,
            bold: rule.format.bold,
            italic: rule.format.italic,
          };
        }
        break;
      }

      case "duplicates": {
        const refs = expandRange(rule.range);
        const valueMap = new Map<string, number>();
        for (const ref of refs) {
          const v = cells[ref]?.value ?? "";
          const r = v.startsWith("=") ? evalFormula(v, cells) : v;
          if (r) valueMap.set(r, (valueMap.get(r) ?? 0) + 1);
        }
        if ((valueMap.get(resolved) ?? 0) > 1 && rule.format) {
          return {
            bgColor: rule.format.bgColor,
            textColor: rule.format.textColor,
            bold: rule.format.bold,
            italic: rule.format.italic,
          };
        }
        break;
      }

      case "topBottom": {
        const num = Number.parseFloat(resolved);
        if (Number.isNaN(num)) break;

        const values = getRangeValues(rule.range, cells);
        const n = rule.topBottomValue ?? 10;
        const sorted = [...values].sort((a, b) => b - a);
        const count = rule.topBottomPercent
          ? Math.ceil((n / 100) * sorted.length)
          : n;

        const isTop = rule.topBottomType !== "bottom";
        const threshold = isTop
          ? sorted[Math.min(count - 1, sorted.length - 1)]
          : sorted[Math.max(sorted.length - count, 0)];

        const matches = isTop ? num >= threshold : num <= threshold;
        if (matches && rule.format) {
          return {
            bgColor: rule.format.bgColor,
            textColor: rule.format.textColor,
            bold: rule.format.bold,
            italic: rule.format.italic,
          };
        }
        break;
      }
    }

    if (rule.stopIfTrue) break;
  }

  return null;
}
