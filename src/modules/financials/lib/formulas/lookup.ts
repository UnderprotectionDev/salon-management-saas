import {
  type FormulaContext,
  getNum,
  getRawValue,
  registerFormula,
  splitTopLevelArgs,
} from "./registry";
import { expandRange, parseRef } from "../cell-refs";

function resolveValue(arg: string, ctx: FormulaContext): string {
  const trimmed = arg.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (parseRef(trimmed)) {
    return getRawValue(trimmed, ctx);
  }
  return trimmed;
}

/** Get dimensions of a range */
function getRangeDimensions(rangeStr: string): {
  startRow: number;
  startCol: number;
  rows: number;
  cols: number;
  refs: string[][];
} | null {
  const parts = rangeStr.split(":");
  if (parts.length !== 2) return null;
  const start = parseRef(parts[0]);
  const end = parseRef(parts[1]);
  if (!start || !end) return null;

  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const refs: string[][] = [];
  for (let r = minR; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = minC; c <= maxC; c++) {
      let colStr = "";
      let n = c + 1;
      while (n > 0) {
        colStr = String.fromCharCode(64 + (n % 26 || 26)) + colStr;
        n = Math.floor((n - 1) / 26);
      }
      row.push(`${colStr}${r + 1}`);
    }
    refs.push(row);
  }

  return {
    startRow: minR,
    startCol: minC,
    rows: maxR - minR + 1,
    cols: maxC - minC + 1,
    refs,
  };
}

// VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])
registerFormula("VLOOKUP", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";

  const lookupValue = resolveValue(args[0], ctx);
  const tableRange = args[1].trim();
  const colIndex = Math.round(
    parseRef(args[2].trim())
      ? getNum(args[2].trim(), ctx)
      : Number.parseFloat(args[2]),
  );
  const rangeLookup =
    args.length > 3
      ? resolveValue(args[3], ctx).toUpperCase() !== "FALSE" &&
        resolveValue(args[3], ctx) !== "0"
      : true;

  const table = getRangeDimensions(tableRange);
  if (!table || colIndex < 1 || colIndex > table.cols) return "#ERROR";

  const lookupNum = Number.parseFloat(lookupValue);
  const isNumeric = !Number.isNaN(lookupNum);

  if (rangeLookup) {
    // Approximate match (assumes sorted first column)
    let lastMatch = -1;
    for (let r = 0; r < table.rows; r++) {
      const cellVal = getRawValue(table.refs[r][0], ctx);
      const cellNum = Number.parseFloat(cellVal);
      if (isNumeric && !Number.isNaN(cellNum)) {
        if (cellNum <= lookupNum) lastMatch = r;
        else break;
      } else {
        if (cellVal.localeCompare(lookupValue) <= 0) lastMatch = r;
        else break;
      }
    }
    if (lastMatch === -1) return "#N/A";
    return getRawValue(table.refs[lastMatch][colIndex - 1], ctx);
  }

  // Exact match
  for (let r = 0; r < table.rows; r++) {
    const cellVal = getRawValue(table.refs[r][0], ctx);
    if (isNumeric) {
      if (Number.parseFloat(cellVal) === lookupNum) {
        return getRawValue(table.refs[r][colIndex - 1], ctx);
      }
    } else {
      if (cellVal.toUpperCase() === lookupValue.toUpperCase()) {
        return getRawValue(table.refs[r][colIndex - 1], ctx);
      }
    }
  }
  return "#N/A";
});

// HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])
registerFormula("HLOOKUP", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 3) return "#ERROR";

  const lookupValue = resolveValue(args[0], ctx);
  const tableRange = args[1].trim();
  const rowIndex = Math.round(
    parseRef(args[2].trim())
      ? getNum(args[2].trim(), ctx)
      : Number.parseFloat(args[2]),
  );
  const rangeLookup =
    args.length > 3
      ? resolveValue(args[3], ctx).toUpperCase() !== "FALSE" &&
        resolveValue(args[3], ctx) !== "0"
      : true;

  const table = getRangeDimensions(tableRange);
  if (!table || rowIndex < 1 || rowIndex > table.rows) return "#ERROR";

  const lookupNum = Number.parseFloat(lookupValue);
  const isNumeric = !Number.isNaN(lookupNum);

  if (rangeLookup) {
    let lastMatch = -1;
    for (let c = 0; c < table.cols; c++) {
      const cellVal = getRawValue(table.refs[0][c], ctx);
      const cellNum = Number.parseFloat(cellVal);
      if (isNumeric && !Number.isNaN(cellNum)) {
        if (cellNum <= lookupNum) lastMatch = c;
        else break;
      } else {
        if (cellVal.localeCompare(lookupValue) <= 0) lastMatch = c;
        else break;
      }
    }
    if (lastMatch === -1) return "#N/A";
    return getRawValue(table.refs[rowIndex - 1][lastMatch], ctx);
  }

  for (let c = 0; c < table.cols; c++) {
    const cellVal = getRawValue(table.refs[0][c], ctx);
    if (isNumeric) {
      if (Number.parseFloat(cellVal) === lookupNum) {
        return getRawValue(table.refs[rowIndex - 1][c], ctx);
      }
    } else {
      if (cellVal.toUpperCase() === lookupValue.toUpperCase()) {
        return getRawValue(table.refs[rowIndex - 1][c], ctx);
      }
    }
  }
  return "#N/A";
});

// INDEX(array, row_num, [col_num])
registerFormula("INDEX", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";

  const rangeStr = args[0].trim();
  const rowNum = Math.round(
    parseRef(args[1].trim())
      ? getNum(args[1].trim(), ctx)
      : Number.parseFloat(args[1]),
  );
  const colNum =
    args.length > 2
      ? Math.round(
          parseRef(args[2].trim())
            ? getNum(args[2].trim(), ctx)
            : Number.parseFloat(args[2]),
        )
      : 1;

  const table = getRangeDimensions(rangeStr);
  if (!table) return "#ERROR";
  if (rowNum < 1 || rowNum > table.rows || colNum < 1 || colNum > table.cols)
    return "#ERROR";

  return getRawValue(table.refs[rowNum - 1][colNum - 1], ctx);
});

// MATCH(lookup_value, lookup_array, [match_type])
registerFormula("MATCH", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";

  const lookupValue = resolveValue(args[0], ctx);
  const rangeStr = args[1].trim();
  const matchType =
    args.length > 2
      ? Math.round(
          parseRef(args[2].trim())
            ? getNum(args[2].trim(), ctx)
            : Number.parseFloat(args[2]),
        )
      : 1;

  const refs = expandRange(rangeStr);
  if (refs.length === 0) return "#ERROR";

  const lookupNum = Number.parseFloat(lookupValue);
  const isNumeric = !Number.isNaN(lookupNum);

  if (matchType === 0) {
    // Exact match
    for (let i = 0; i < refs.length; i++) {
      const cellVal = getRawValue(refs[i], ctx);
      if (isNumeric) {
        if (Number.parseFloat(cellVal) === lookupNum) return String(i + 1);
      } else {
        if (cellVal.toUpperCase() === lookupValue.toUpperCase())
          return String(i + 1);
      }
    }
    return "#N/A";
  }

  if (matchType === 1) {
    // Largest value <= lookup (assumes ascending)
    let lastMatch = -1;
    for (let i = 0; i < refs.length; i++) {
      const cellVal = getRawValue(refs[i], ctx);
      if (isNumeric) {
        const cellNum = Number.parseFloat(cellVal);
        if (!Number.isNaN(cellNum) && cellNum <= lookupNum) lastMatch = i;
      } else {
        if (cellVal.localeCompare(lookupValue) <= 0) lastMatch = i;
      }
    }
    return lastMatch === -1 ? "#N/A" : String(lastMatch + 1);
  }

  if (matchType === -1) {
    // Smallest value >= lookup (assumes descending)
    let lastMatch = -1;
    for (let i = 0; i < refs.length; i++) {
      const cellVal = getRawValue(refs[i], ctx);
      if (isNumeric) {
        const cellNum = Number.parseFloat(cellVal);
        if (!Number.isNaN(cellNum) && cellNum >= lookupNum) lastMatch = i;
      } else {
        if (cellVal.localeCompare(lookupValue) >= 0) lastMatch = i;
      }
    }
    return lastMatch === -1 ? "#N/A" : String(lastMatch + 1);
  }

  return "#ERROR";
});

// CHOOSE(index_num, value1, [value2], ...)
registerFormula("CHOOSE", (argsStr, ctx) => {
  const args = splitTopLevelArgs(argsStr);
  if (args.length < 2) return "#ERROR";
  const index = Math.round(
    parseRef(args[0].trim())
      ? getNum(args[0].trim(), ctx)
      : Number.parseFloat(args[0]),
  );
  if (Number.isNaN(index) || index < 1 || index >= args.length) return "#ERROR";
  return resolveValue(args[index], ctx);
});
