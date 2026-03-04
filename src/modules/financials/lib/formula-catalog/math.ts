import type { FormulaEntry } from "./types";

export const MATH_FORMULAS: FormulaEntry[] = [
  {
    name: "SUM",
    syntax: "SUM(range)",
    description: "Adds all numbers in a range",
    example: "=SUM(A1:A10)",
    category: "Math",
    params: [
      { name: "range", type: "range", description: "Range of cells to sum" },
    ],
  },
  {
    name: "ROUND",
    syntax: "ROUND(number, digits)",
    description: "Rounds a number to a specified number of digits",
    example: "=ROUND(A1, 2)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to round" },
      {
        name: "digits",
        type: "number",
        description: "Number of decimal places",
        example: "2",
      },
    ],
  },
  {
    name: "ABS",
    syntax: "ABS(number)",
    description: "Returns the absolute value of a number",
    example: "=ABS(A1)",
    category: "Math",
    params: [{ name: "number", type: "number", description: "The number" }],
  },
  {
    name: "CEILING",
    syntax: "CEILING(number, significance)",
    description: "Rounds a number up to the nearest multiple of significance",
    example: "=CEILING(A1, 10)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to round up" },
      {
        name: "significance",
        type: "number",
        description: "Multiple to round up to",
        example: "10",
      },
    ],
  },
  {
    name: "FLOOR",
    syntax: "FLOOR(number, significance)",
    description: "Rounds a number down to the nearest multiple of significance",
    example: "=FLOOR(A1, 10)",
    category: "Math",
    params: [
      {
        name: "number",
        type: "number",
        description: "The number to round down",
      },
      {
        name: "significance",
        type: "number",
        description: "Multiple to round down to",
        example: "10",
      },
    ],
  },
  {
    name: "SUMPRODUCT",
    syntax: "SUMPRODUCT(range1, range2)",
    description: "Multiplies corresponding elements in ranges and sums them",
    example: "=SUMPRODUCT(A1:A5, B1:B5)",
    category: "Math",
    params: [
      { name: "range1", type: "range", description: "First range of values" },
      { name: "range2", type: "range", description: "Second range of values" },
    ],
  },
  {
    name: "POWER",
    syntax: "POWER(number, power)",
    description: "Returns the result of a number raised to a power",
    example: "=POWER(2, 10)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The base number" },
      { name: "power", type: "number", description: "The exponent" },
    ],
  },
  {
    name: "MOD",
    syntax: "MOD(number, divisor)",
    description: "Returns the remainder after dividing a number by a divisor",
    example: "=MOD(10, 3)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The dividend" },
      { name: "divisor", type: "number", description: "The divisor" },
    ],
  },
  {
    name: "ROUNDUP",
    syntax: "ROUNDUP(number, digits)",
    description: "Rounds a number up, away from zero",
    example: "=ROUNDUP(3.14, 1)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to round up" },
      {
        name: "digits",
        type: "number",
        description: "Number of decimal places",
      },
    ],
  },
  {
    name: "ROUNDDOWN",
    syntax: "ROUNDDOWN(number, digits)",
    description: "Rounds a number down, toward zero",
    example: "=ROUNDDOWN(3.99, 1)",
    category: "Math",
    params: [
      {
        name: "number",
        type: "number",
        description: "The number to round down",
      },
      {
        name: "digits",
        type: "number",
        description: "Number of decimal places",
      },
    ],
  },
  {
    name: "SQRT",
    syntax: "SQRT(number)",
    description: "Returns the square root of a number",
    example: "=SQRT(144)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "A non-negative number" },
    ],
  },
  {
    name: "LOG",
    syntax: "LOG(number, base)",
    description: "Returns the logarithm of a number to a specified base",
    example: "=LOG(100, 10)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "A positive number" },
      {
        name: "base",
        type: "number",
        description: "The base (default 10)",
        example: "10",
      },
    ],
  },
  {
    name: "LOG10",
    syntax: "LOG10(number)",
    description: "Returns the base-10 logarithm of a number",
    example: "=LOG10(1000)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "A positive number" },
    ],
  },
  {
    name: "INT",
    syntax: "INT(number)",
    description: "Rounds a number down to the nearest integer",
    example: "=INT(3.7)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to truncate" },
    ],
  },
  {
    name: "RAND",
    syntax: "RAND()",
    description: "Returns a random number between 0 and 1",
    example: "=RAND()",
    category: "Math",
  },
  {
    name: "RANDBETWEEN",
    syntax: "RANDBETWEEN(bottom, top)",
    description: "Returns a random integer between two values",
    example: "=RANDBETWEEN(1, 100)",
    category: "Math",
    params: [
      { name: "bottom", type: "number", description: "Minimum value" },
      { name: "top", type: "number", description: "Maximum value" },
    ],
  },
  {
    name: "SIGN",
    syntax: "SIGN(number)",
    description: "Returns the sign of a number: 1, 0, or -1",
    example: "=SIGN(-5)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to check" },
    ],
  },
  {
    name: "PI",
    syntax: "PI()",
    description: "Returns the value of Pi (3.14159...)",
    example: "=PI()",
    category: "Math",
  },
  {
    name: "PRODUCT",
    syntax: "PRODUCT(range)",
    description: "Multiplies all numbers in a range",
    example: "=PRODUCT(A1:A5)",
    category: "Math",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range of cells to multiply",
      },
    ],
  },
  {
    name: "TRUNC",
    syntax: "TRUNC(number, digits)",
    description: "Truncates a number to a specified number of decimal places",
    example: "=TRUNC(3.14159, 2)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to truncate" },
      {
        name: "digits",
        type: "number",
        description: "Number of decimal places (default 0)",
      },
    ],
  },
  {
    name: "GCD",
    syntax: "GCD(number1, number2)",
    description: "Returns the greatest common divisor",
    example: "=GCD(12, 8)",
    category: "Math",
    params: [
      { name: "number1", type: "number", description: "First number" },
      { name: "number2", type: "number", description: "Second number" },
    ],
  },
  {
    name: "LCM",
    syntax: "LCM(number1, number2)",
    description: "Returns the least common multiple",
    example: "=LCM(4, 6)",
    category: "Math",
    params: [
      { name: "number1", type: "number", description: "First number" },
      { name: "number2", type: "number", description: "Second number" },
    ],
  },
  {
    name: "EVEN",
    syntax: "EVEN(number)",
    description: "Rounds a number up to the nearest even integer",
    example: "=EVEN(3)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to round" },
    ],
  },
  {
    name: "ODD",
    syntax: "ODD(number)",
    description: "Rounds a number up to the nearest odd integer",
    example: "=ODD(4)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "The number to round" },
    ],
  },
  {
    name: "FACT",
    syntax: "FACT(number)",
    description: "Returns the factorial of a number",
    example: "=FACT(5)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "Non-negative integer" },
    ],
  },
  {
    name: "COMBIN",
    syntax: "COMBIN(n, k)",
    description:
      "Returns the number of combinations for a given number of items",
    example: "=COMBIN(10, 3)",
    category: "Math",
    params: [
      { name: "n", type: "number", description: "Total items" },
      { name: "k", type: "number", description: "Items to choose" },
    ],
  },
  {
    name: "PERMUT",
    syntax: "PERMUT(n, k)",
    description:
      "Returns the number of permutations for a given number of items",
    example: "=PERMUT(10, 3)",
    category: "Math",
    params: [
      { name: "n", type: "number", description: "Total items" },
      { name: "k", type: "number", description: "Items to arrange" },
    ],
  },
  {
    name: "DEGREES",
    syntax: "DEGREES(radians)",
    description: "Converts radians to degrees",
    example: "=DEGREES(PI())",
    category: "Math",
    params: [
      { name: "radians", type: "number", description: "Angle in radians" },
    ],
  },
  {
    name: "RADIANS",
    syntax: "RADIANS(degrees)",
    description: "Converts degrees to radians",
    example: "=RADIANS(180)",
    category: "Math",
    params: [
      { name: "degrees", type: "number", description: "Angle in degrees" },
    ],
  },
  {
    name: "SIN",
    syntax: "SIN(number)",
    description: "Returns the sine of an angle (in radians)",
    example: "=SIN(PI()/2)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "Angle in radians" },
    ],
  },
  {
    name: "COS",
    syntax: "COS(number)",
    description: "Returns the cosine of an angle (in radians)",
    example: "=COS(0)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "Angle in radians" },
    ],
  },
  {
    name: "TAN",
    syntax: "TAN(number)",
    description: "Returns the tangent of an angle (in radians)",
    example: "=TAN(PI()/4)",
    category: "Math",
    params: [
      { name: "number", type: "number", description: "Angle in radians" },
    ],
  },
];
