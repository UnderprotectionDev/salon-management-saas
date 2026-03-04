import type { FormulaEntry } from "./types";

export const LOOKUP_FORMULAS: FormulaEntry[] = [
  {
    name: "VLOOKUP",
    syntax: "VLOOKUP(value, range, col_index, exact)",
    description:
      "Looks up a value in the first column and returns a value in the same row from another column",
    example: "=VLOOKUP(A1, D1:F10, 2, 0)",
    category: "Lookup",
    params: [
      { name: "value", type: "any", description: "The value to search for" },
      {
        name: "range",
        type: "range",
        description: "The table range to search",
      },
      {
        name: "col_index",
        type: "number",
        description: "Column number to return (1-based)",
      },
      {
        name: "exact",
        type: "boolean",
        description:
          "FALSE (or 0) for exact match, TRUE (or 1) for approximate",
        example: "0",
      },
    ],
  },
  {
    name: "HLOOKUP",
    syntax: "HLOOKUP(value, range, row_index, exact)",
    description:
      "Looks up a value in the first row and returns a value in the same column from another row",
    example: "=HLOOKUP(A1, A1:F3, 2, 0)",
    category: "Lookup",
    params: [
      { name: "value", type: "any", description: "The value to search for" },
      {
        name: "range",
        type: "range",
        description: "The table range to search",
      },
      {
        name: "row_index",
        type: "number",
        description: "Row number to return (1-based)",
      },
      {
        name: "exact",
        type: "boolean",
        description:
          "FALSE (or 0) for exact match, TRUE (or 1) for approximate",
        example: "0",
      },
    ],
  },
  {
    name: "INDEX",
    syntax: "INDEX(range, row_num, col_num)",
    description:
      "Returns the value of a cell in a range based on row and column numbers",
    example: "=INDEX(A1:C5, 3, 2)",
    category: "Lookup",
    params: [
      { name: "range", type: "range", description: "The range of cells" },
      { name: "row_num", type: "number", description: "Row number (1-based)" },
      {
        name: "col_num",
        type: "number",
        description: "Column number (1-based, optional)",
      },
    ],
  },
  {
    name: "MATCH",
    syntax: "MATCH(value, range, match_type)",
    description: "Returns the relative position of an item in a range",
    example: "=MATCH(100, A1:A10, 0)",
    category: "Lookup",
    params: [
      { name: "value", type: "any", description: "The value to find" },
      { name: "range", type: "range", description: "The range to search" },
      {
        name: "match_type",
        type: "number",
        description: "0 for exact match, 1 for less than, -1 for greater than",
        example: "0",
      },
    ],
  },
  {
    name: "OFFSET",
    syntax: "OFFSET(reference, rows, cols)",
    description: "Returns a value offset from a given reference",
    example: "=OFFSET(A1, 2, 3)",
    category: "Lookup",
    params: [
      {
        name: "reference",
        type: "any",
        description: "Starting cell reference",
      },
      { name: "rows", type: "number", description: "Number of rows to offset" },
      {
        name: "cols",
        type: "number",
        description: "Number of columns to offset",
      },
    ],
  },
  {
    name: "INDIRECT",
    syntax: "INDIRECT(ref_text)",
    description:
      "Returns the value of a cell specified by a text string reference",
    example: '=INDIRECT("A1")',
    category: "Lookup",
    params: [
      { name: "ref_text", type: "text", description: "Cell reference as text" },
    ],
  },
  {
    name: "ROW",
    syntax: "ROW(reference)",
    description: "Returns the row number of a cell reference",
    example: "=ROW(A5)",
    category: "Lookup",
    params: [{ name: "reference", type: "any", description: "Cell reference" }],
  },
  {
    name: "COLUMN",
    syntax: "COLUMN(reference)",
    description: "Returns the column number of a cell reference",
    example: "=COLUMN(C1)",
    category: "Lookup",
    params: [{ name: "reference", type: "any", description: "Cell reference" }],
  },
  {
    name: "ROWS",
    syntax: "ROWS(range)",
    description: "Returns the number of rows in a range",
    example: "=ROWS(A1:A10)",
    category: "Lookup",
    params: [
      { name: "range", type: "range", description: "The range to measure" },
    ],
  },
  {
    name: "COLUMNS",
    syntax: "COLUMNS(range)",
    description: "Returns the number of columns in a range",
    example: "=COLUMNS(A1:D1)",
    category: "Lookup",
    params: [
      { name: "range", type: "range", description: "The range to measure" },
    ],
  },
];
