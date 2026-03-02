/**
 * Fill handle series detection and generation utilities.
 */
import { colLabel } from "./spreadsheet-utils";

type SeriesType = "number" | "copy" | "formula";

interface DetectedSeries {
  type: SeriesType;
  step: number; // for number series
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
