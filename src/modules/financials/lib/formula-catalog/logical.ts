import type { FormulaEntry } from "./types";

export const LOGICAL_FORMULAS: FormulaEntry[] = [
  {
    name: "IF",
    syntax: "IF(condition, true_value, false_value)",
    description: "Returns one value if a condition is true, another if false",
    example: '=IF(A1>100, "High", "Low")',
    category: "Logical",
    params: [
      {
        name: "condition",
        type: "boolean",
        description: "The condition to evaluate",
      },
      { name: "true_value", type: "any", description: "Value if true" },
      { name: "false_value", type: "any", description: "Value if false" },
    ],
  },
  {
    name: "AND",
    syntax: "AND(condition1, condition2, ...)",
    description: "Returns TRUE if all conditions are true",
    example: "=AND(A1>0, B1>0)",
    category: "Logical",
    params: [
      {
        name: "condition1",
        type: "boolean",
        description: "First condition",
      },
      {
        name: "condition2",
        type: "boolean",
        description: "Additional conditions",
      },
    ],
  },
  {
    name: "OR",
    syntax: "OR(condition1, condition2, ...)",
    description: "Returns TRUE if any condition is true",
    example: "=OR(A1>0, B1>0)",
    category: "Logical",
    params: [
      {
        name: "condition1",
        type: "boolean",
        description: "First condition",
      },
      {
        name: "condition2",
        type: "boolean",
        description: "Additional conditions",
      },
    ],
  },
  {
    name: "NOT",
    syntax: "NOT(condition)",
    description: "Reverses the value of a condition",
    example: "=NOT(A1>0)",
    category: "Logical",
    params: [
      {
        name: "condition",
        type: "boolean",
        description: "The condition to reverse",
      },
    ],
  },
  {
    name: "IFERROR",
    syntax: "IFERROR(value, value_if_error)",
    description:
      "Returns value_if_error if the first argument results in an error",
    example: '=IFERROR(A1/B1, "Error")',
    category: "Logical",
    params: [
      {
        name: "value",
        type: "any",
        description: "The value to check for error",
      },
      {
        name: "value_if_error",
        type: "any",
        description: "Value to return if error",
      },
    ],
  },
  {
    name: "CHOOSE",
    syntax: "CHOOSE(index, value1, value2, ...)",
    description: "Returns a value from a list based on index number",
    example: '=CHOOSE(2, "A", "B", "C")',
    category: "Logical",
    params: [
      {
        name: "index",
        type: "number",
        description: "Which value to return (1-based)",
      },
      { name: "value1", type: "any", description: "First choice" },
      { name: "value2", type: "any", description: "Additional choices" },
    ],
  },
  {
    name: "SWITCH",
    syntax: "SWITCH(expression, case1, value1, ..., default)",
    description:
      "Evaluates an expression against a list of cases and returns the matching result",
    example: '=SWITCH(A1, 1, "One", 2, "Two", "Other")',
    category: "Logical",
    params: [
      {
        name: "expression",
        type: "any",
        description: "The value to match",
      },
      { name: "case1", type: "any", description: "First case to compare" },
      { name: "value1", type: "any", description: "Result if case1 matches" },
      {
        name: "default",
        type: "any",
        description: "Default value if no match (optional)",
      },
    ],
  },
  {
    name: "IFS",
    syntax: "IFS(condition1, value1, condition2, value2, ...)",
    description:
      "Checks multiple conditions and returns the first matching value",
    example: '=IFS(A1>90, "A", A1>80, "B", A1>70, "C")',
    category: "Logical",
    params: [
      { name: "condition1", type: "boolean", description: "First condition" },
      {
        name: "value1",
        type: "any",
        description: "Value if first condition is true",
      },
      { name: "condition2", type: "boolean", description: "Second condition" },
      {
        name: "value2",
        type: "any",
        description: "Value if second condition is true",
      },
    ],
  },
  {
    name: "ISBLANK",
    syntax: "ISBLANK(value)",
    description: "Returns TRUE if the cell is empty",
    example: "=ISBLANK(A1)",
    category: "Logical",
    params: [
      { name: "value", type: "any", description: "Cell reference to check" },
    ],
  },
  {
    name: "ISNUMBER",
    syntax: "ISNUMBER(value)",
    description: "Returns TRUE if the value is a number",
    example: "=ISNUMBER(A1)",
    category: "Logical",
    params: [{ name: "value", type: "any", description: "Value to check" }],
  },
  {
    name: "ISTEXT",
    syntax: "ISTEXT(value)",
    description: "Returns TRUE if the value is text",
    example: "=ISTEXT(A1)",
    category: "Logical",
    params: [{ name: "value", type: "any", description: "Value to check" }],
  },
  {
    name: "XOR",
    syntax: "XOR(condition1, condition2, ...)",
    description: "Returns TRUE if an odd number of conditions are true",
    example: "=XOR(A1>0, B1>0)",
    category: "Logical",
    params: [
      { name: "condition1", type: "boolean", description: "First condition" },
      { name: "condition2", type: "boolean", description: "Second condition" },
    ],
  },
  {
    name: "IFNA",
    syntax: "IFNA(value, value_if_na)",
    description: "Returns value_if_na if the first argument results in #N/A",
    example: '=IFNA(VLOOKUP(A1, B:C, 2, 0), "Not found")',
    category: "Logical",
    params: [
      { name: "value", type: "any", description: "The value to check" },
      {
        name: "value_if_na",
        type: "any",
        description: "Value to return if #N/A",
      },
    ],
  },
  {
    name: "ISERROR",
    syntax: "ISERROR(value)",
    description: "Returns TRUE if the value is any error",
    example: "=ISERROR(A1/B1)",
    category: "Logical",
    params: [
      { name: "value", type: "any", description: "Value to check for error" },
    ],
  },
  {
    name: "ISNA",
    syntax: "ISNA(value)",
    description: "Returns TRUE if the value is #N/A",
    example: "=ISNA(VLOOKUP(A1, B:C, 2, 0))",
    category: "Logical",
    params: [
      { name: "value", type: "any", description: "Value to check for #N/A" },
    ],
  },
  {
    name: "TYPE",
    syntax: "TYPE(value)",
    description:
      "Returns a number indicating the data type: 1=number, 2=text, 4=boolean, 16=error",
    example: "=TYPE(A1)",
    category: "Logical",
    params: [
      { name: "value", type: "any", description: "Value to check type of" },
    ],
  },
];
