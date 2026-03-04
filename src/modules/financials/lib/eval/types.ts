import type { CellMap } from "../spreadsheet-types";

export interface EvalContext {
  getNum: (ref: string) => number;
  resolveArgs: (argsStr: string) => number[];
  splitArgs: (inner: string) => string[];
  resolveStr: (arg: string) => string;
  evalCondition: (cond: string) => boolean;
  parseCriteria: (criteria: string) => { op: string; val: number };
  matchesCriteria: (cellVal: number, op: string, critVal: number) => boolean;
  getNumResolved: (argStr: string) => number;
  cells: CellMap;
  evalFormula: (
    raw: string,
    cells: CellMap,
    depth?: number,
    customFormulas?: Record<string, string>,
  ) => string;
  expandRange: (rangeStr: string) => string[];
  parseRef: (ref: string) => { row: number; col: number } | null;
  colToStr: (col: number) => string;
  depth: number;
  customFormulas?: Record<string, string>;
}
