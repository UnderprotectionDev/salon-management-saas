import {
  type FormulaContext,
  getNum,
  getRawValue,
  registerFormula,
  splitTopLevelArgs,
} from "./registry";
import { expandRange, parseRef } from "../cell-refs";

/** Match a cell value against a criteria string (e.g., ">5", "Apple", "<>0") */
function matchesCriteria(
  cellValue: string,
  criteria: string,
  ctx: FormulaContext,
): boolean {
  // Strip surrounding quotes from criteria
  let crit = criteria.replace(/^"(.*)"$/, "$1");

  // Resolve criteria if it's a cell reference
  if (parseRef(crit)) {
    crit = getRawValue(crit, ctx);
  }

  // Operator-based criteria
  const opMatch = crit.match(/^(>=|<=|<>|>|<|=)(.+)$/);
  if (opMatch) {
    const op = opMatch[1];
    const compareVal = opMatch[2];
    const cellNum = Number.parseFloat(cellValue);
    const compareNum = Number.parseFloat(compareVal);
    const bothNumeric = !Number.isNaN(cellNum) && !Number.isNaN(compareNum);

    if (op === ">")
      return bothNumeric ? cellNum > compareNum : cellValue > compareVal;
    if (op === "<")
      return bothNumeric ? cellNum < compareNum : cellValue < compareVal;
    if (op === ">=")
      return bothNumeric ? cellNum >= compareNum : cellValue >= compareVal;
    if (op === "<=")
      return bothNumeric ? cellNum <= compareNum : cellValue <= compareVal;
    if (op === "=")
      return bothNumeric
        ? cellNum === compareNum
        : cellValue.toUpperCase() === compareVal.toUpperCase();
    if (op === "<>")
      return bothNumeric
        ? cellNum !== compareNum
        : cellValue.toUpperCase() !== compareVal.toUpperCase();
  }

  // Wildcard support (* and ?)
  if (crit.includes("*") || crit.includes("?")) {
    // Escape regex metacharacters first, then convert wildcards
    const escaped = crit.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped.replace(/\\\*/g, ".*").replace(/\\\?/g, ".");
    const regex = new RegExp(`^${pattern}$`, "i");
    return regex.test(cellValue);
  }

  // Direct comparison
  const cellNum = Number.parseFloat(cellValue);
  const critNum = Number.parseFloat(crit);
  if (!Number.isNaN(cellNum) && !Number.isNaN(critNum)) {
    return cellNum === critNum;
  }
  return cellValue.toUpperCase() === crit.toUpperCase();
}

// SUMIF(range, criteria, [sum_range])
registerFormula("SUMIF", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";

  const criteriaRange = expandRange(args[0].trim());
  const criteria = args[1].trim();
  const sumRange =
    args.length > 2 ? expandRange(args[2].trim()) : criteriaRange;

  let sum = 0;
  for (let i = 0; i < criteriaRange.length; i++) {
    const cellVal = getRawValue(criteriaRange[i], ctx);
    if (matchesCriteria(cellVal, criteria, ctx)) {
      sum += i < sumRange.length ? getNum(sumRange[i], ctx) : 0;
    }
  }
  return String(sum);
});

// COUNTIF(range, criteria)
registerFormula("COUNTIF", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";

  const range = expandRange(args[0].trim());
  const criteria = args[1].trim();

  let count = 0;
  for (const ref of range) {
    const cellVal = getRawValue(ref, ctx);
    if (matchesCriteria(cellVal, criteria, ctx)) count++;
  }
  return String(count);
});

// AVERAGEIF(range, criteria, [average_range])
registerFormula("AVERAGEIF", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";

  const criteriaRange = expandRange(args[0].trim());
  const criteria = args[1].trim();
  const avgRange =
    args.length > 2 ? expandRange(args[2].trim()) : criteriaRange;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < criteriaRange.length; i++) {
    const cellVal = getRawValue(criteriaRange[i], ctx);
    if (matchesCriteria(cellVal, criteria, ctx) && i < avgRange.length) {
      sum += getNum(avgRange[i], ctx);
      count++;
    }
  }
  return count === 0 ? "#ERROR" : String(sum / count);
});

// SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)
registerFormula("SUMIFS", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3 || args.length % 2 === 0) return "#ERROR";

  const sumRange = expandRange(args[0].trim());
  const pairs: { range: string[]; criteria: string }[] = [];

  for (let i = 1; i < args.length; i += 2) {
    pairs.push({
      range: expandRange(args[i].trim()),
      criteria: args[i + 1].trim(),
    });
  }

  let sum = 0;
  for (let i = 0; i < sumRange.length; i++) {
    let allMatch = true;
    for (const pair of pairs) {
      if (i >= pair.range.length) {
        allMatch = false;
        break;
      }
      const cellVal = getRawValue(pair.range[i], ctx);
      if (!matchesCriteria(cellVal, pair.criteria, ctx)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      sum += getNum(sumRange[i], ctx);
    }
  }
  return String(sum);
});

// COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2], ...)
registerFormula("COUNTIFS", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2 || args.length % 2 !== 0) return "#ERROR";

  const pairs: { range: string[]; criteria: string }[] = [];
  for (let i = 0; i < args.length; i += 2) {
    pairs.push({
      range: expandRange(args[i].trim()),
      criteria: args[i + 1].trim(),
    });
  }

  const length = pairs[0].range.length;
  let count = 0;
  for (let i = 0; i < length; i++) {
    let allMatch = true;
    for (const pair of pairs) {
      if (i >= pair.range.length) {
        allMatch = false;
        break;
      }
      const cellVal = getRawValue(pair.range[i], ctx);
      if (!matchesCriteria(cellVal, pair.criteria, ctx)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) count++;
  }
  return String(count);
});

// MAXIFS(max_range, criteria_range1, criteria1, ...)
registerFormula("MAXIFS", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3 || args.length % 2 === 0) return "#ERROR";

  const maxRange = expandRange(args[0].trim());
  const pairs: { range: string[]; criteria: string }[] = [];
  for (let i = 1; i < args.length; i += 2) {
    pairs.push({
      range: expandRange(args[i].trim()),
      criteria: args[i + 1].trim(),
    });
  }

  let max = -Infinity;
  let found = false;
  for (let i = 0; i < maxRange.length; i++) {
    let allMatch = true;
    for (const pair of pairs) {
      if (
        i >= pair.range.length ||
        !matchesCriteria(getRawValue(pair.range[i], ctx), pair.criteria, ctx)
      ) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      const val = getNum(maxRange[i], ctx);
      if (val > max) max = val;
      found = true;
    }
  }
  return found ? String(max) : "0";
});

// MINIFS(min_range, criteria_range1, criteria1, ...)
registerFormula("MINIFS", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3 || args.length % 2 === 0) return "#ERROR";

  const minRange = expandRange(args[0].trim());
  const pairs: { range: string[]; criteria: string }[] = [];
  for (let i = 1; i < args.length; i += 2) {
    pairs.push({
      range: expandRange(args[i].trim()),
      criteria: args[i + 1].trim(),
    });
  }

  let min = Infinity;
  let found = false;
  for (let i = 0; i < minRange.length; i++) {
    let allMatch = true;
    for (const pair of pairs) {
      if (
        i >= pair.range.length ||
        !matchesCriteria(getRawValue(pair.range[i], ctx), pair.criteria, ctx)
      ) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      const val = getNum(minRange[i], ctx);
      if (val < min) min = val;
      found = true;
    }
  }
  return found ? String(min) : "0";
});
