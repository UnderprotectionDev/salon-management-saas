import type { FormulaEntry } from "./types";

export const TEXT_FORMULAS: FormulaEntry[] = [
  {
    name: "CONCATENATE",
    syntax: "CONCATENATE(text1, text2, ...)",
    description: "Joins multiple text strings into one",
    example: '=CONCATENATE(A1, " ", B1)',
    category: "Text",
    params: [
      { name: "text1", type: "text", description: "First text string" },
      {
        name: "text2",
        type: "text",
        description: "Additional text strings",
      },
    ],
  },
  {
    name: "LEFT",
    syntax: "LEFT(text, num_chars)",
    description: "Returns characters from the start of a text string",
    example: "=LEFT(A1, 3)",
    category: "Text",
    params: [
      { name: "text", type: "text", description: "The text string" },
      {
        name: "num_chars",
        type: "number",
        description: "Number of characters to return",
      },
    ],
  },
  {
    name: "RIGHT",
    syntax: "RIGHT(text, num_chars)",
    description: "Returns characters from the end of a text string",
    example: "=RIGHT(A1, 3)",
    category: "Text",
    params: [
      { name: "text", type: "text", description: "The text string" },
      {
        name: "num_chars",
        type: "number",
        description: "Number of characters to return",
      },
    ],
  },
  {
    name: "MID",
    syntax: "MID(text, start, num_chars)",
    description: "Returns characters from the middle of a text string",
    example: "=MID(A1, 2, 3)",
    category: "Text",
    params: [
      { name: "text", type: "text", description: "The text string" },
      {
        name: "start",
        type: "number",
        description: "Starting position (1-based)",
      },
      {
        name: "num_chars",
        type: "number",
        description: "Number of characters to return",
      },
    ],
  },
  {
    name: "LEN",
    syntax: "LEN(text)",
    description: "Returns the number of characters in a text string",
    example: "=LEN(A1)",
    category: "Text",
    params: [{ name: "text", type: "text", description: "The text string" }],
  },
  {
    name: "UPPER",
    syntax: "UPPER(text)",
    description: "Converts text to uppercase",
    example: "=UPPER(A1)",
    category: "Text",
    params: [{ name: "text", type: "text", description: "Text to convert" }],
  },
  {
    name: "LOWER",
    syntax: "LOWER(text)",
    description: "Converts text to lowercase",
    example: "=LOWER(A1)",
    category: "Text",
    params: [{ name: "text", type: "text", description: "Text to convert" }],
  },
  {
    name: "TRIM",
    syntax: "TRIM(text)",
    description: "Removes extra spaces from text",
    example: "=TRIM(A1)",
    category: "Text",
    params: [{ name: "text", type: "text", description: "Text to trim" }],
  },
  {
    name: "FIND",
    syntax: "FIND(find_text, within_text, start)",
    description: "Returns the position of a substring (case-sensitive)",
    example: '=FIND("a", A1)',
    category: "Text",
    params: [
      { name: "find_text", type: "text", description: "Text to find" },
      {
        name: "within_text",
        type: "text",
        description: "Text to search within",
      },
      {
        name: "start",
        type: "number",
        description: "Starting position (optional, default 1)",
      },
    ],
  },
  {
    name: "SUBSTITUTE",
    syntax: "SUBSTITUTE(text, old_text, new_text)",
    description: "Replaces occurrences of old text with new text",
    example: '=SUBSTITUTE(A1, "old", "new")',
    category: "Text",
    params: [
      { name: "text", type: "text", description: "The original text" },
      { name: "old_text", type: "text", description: "Text to replace" },
      { name: "new_text", type: "text", description: "Replacement text" },
    ],
  },
  {
    name: "PROPER",
    syntax: "PROPER(text)",
    description: "Capitalizes the first letter of each word",
    example: "=PROPER(A1)",
    category: "Text",
    params: [{ name: "text", type: "text", description: "Text to capitalize" }],
  },
  {
    name: "REPT",
    syntax: "REPT(text, number)",
    description: "Repeats text a given number of times",
    example: '=REPT("*", 5)',
    category: "Text",
    params: [
      { name: "text", type: "text", description: "Text to repeat" },
      { name: "number", type: "number", description: "Number of repetitions" },
    ],
  },
  {
    name: "VALUE",
    syntax: "VALUE(text)",
    description: "Converts a text string that represents a number to a number",
    example: '=VALUE("123.45")',
    category: "Text",
    params: [
      {
        name: "text",
        type: "text",
        description: "Text representing a number",
      },
    ],
  },
  {
    name: "TEXT",
    syntax: "TEXT(value, format)",
    description: "Formats a number as text with a specified format",
    example: '=TEXT(1234.5, "#,##0.00")',
    category: "Text",
    params: [
      { name: "value", type: "number", description: "The number to format" },
      {
        name: "format",
        type: "text",
        description: 'Format string (e.g. "#,##0.00", "0%")',
      },
    ],
  },
  {
    name: "EXACT",
    syntax: "EXACT(text1, text2)",
    description:
      "Checks if two text strings are exactly the same (case-sensitive)",
    example: '=EXACT("Hello", "hello")',
    category: "Text",
    params: [
      { name: "text1", type: "text", description: "First text string" },
      { name: "text2", type: "text", description: "Second text string" },
    ],
  },
  {
    name: "REPLACE",
    syntax: "REPLACE(old_text, start, num_chars, new_text)",
    description: "Replaces part of a text string with a different text string",
    example: '=REPLACE(A1, 2, 3, "XYZ")',
    category: "Text",
    params: [
      { name: "old_text", type: "text", description: "Original text" },
      {
        name: "start",
        type: "number",
        description: "Starting position (1-based)",
      },
      {
        name: "num_chars",
        type: "number",
        description: "Number of characters to replace",
      },
      { name: "new_text", type: "text", description: "Replacement text" },
    ],
  },
  {
    name: "SEARCH",
    syntax: "SEARCH(find_text, within_text, start)",
    description: "Returns the position of a substring (case-insensitive)",
    example: '=SEARCH("hello", A1)',
    category: "Text",
    params: [
      { name: "find_text", type: "text", description: "Text to find" },
      {
        name: "within_text",
        type: "text",
        description: "Text to search within",
      },
      {
        name: "start",
        type: "number",
        description: "Starting position (optional, default 1)",
      },
    ],
  },
  {
    name: "CHAR",
    syntax: "CHAR(number)",
    description: "Returns the character specified by a number (ASCII/Unicode)",
    example: "=CHAR(65)",
    category: "Text",
    params: [
      { name: "number", type: "number", description: "Character code number" },
    ],
  },
  {
    name: "CODE",
    syntax: "CODE(text)",
    description:
      "Returns the numeric code for the first character in a text string",
    example: '=CODE("A")',
    category: "Text",
    params: [
      { name: "text", type: "text", description: "Text to get code from" },
    ],
  },
  {
    name: "CLEAN",
    syntax: "CLEAN(text)",
    description: "Removes all non-printable characters from text",
    example: "=CLEAN(A1)",
    category: "Text",
    params: [{ name: "text", type: "text", description: "Text to clean" }],
  },
  {
    name: "TEXTJOIN",
    syntax: "TEXTJOIN(delimiter, ignore_empty, range)",
    description: "Joins text from a range with a delimiter",
    example: '=TEXTJOIN(", ", 1, A1:A5)',
    category: "Text",
    params: [
      {
        name: "delimiter",
        type: "text",
        description: "Text between each item",
      },
      {
        name: "ignore_empty",
        type: "boolean",
        description: "1 to ignore empty cells, 0 to include",
      },
      { name: "range", type: "range", description: "Range of cells to join" },
    ],
  },
  {
    name: "CONCAT",
    syntax: "CONCAT(text1, text2, ...)",
    description: "Joins text strings (modern version of CONCATENATE)",
    example: '=CONCAT(A1, " ", B1)',
    category: "Text",
    params: [
      { name: "text1", type: "text", description: "First text" },
      { name: "text2", type: "text", description: "Additional text" },
    ],
  },
  {
    name: "NUMBERVALUE",
    syntax: "NUMBERVALUE(text, decimal_sep, group_sep)",
    description: "Converts text to a number with custom separators",
    example: '=NUMBERVALUE("1.234,56", ",", ".")',
    category: "Text",
    params: [
      { name: "text", type: "text", description: "Text to convert" },
      {
        name: "decimal_sep",
        type: "text",
        description: 'Decimal separator (default ".")',
      },
      {
        name: "group_sep",
        type: "text",
        description: 'Group separator (default ",")',
      },
    ],
  },
  {
    name: "FIXED",
    syntax: "FIXED(number, decimals, no_commas)",
    description: "Formats a number as text with a fixed number of decimals",
    example: "=FIXED(1234.567, 2)",
    category: "Text",
    params: [
      { name: "number", type: "number", description: "The number to format" },
      {
        name: "decimals",
        type: "number",
        description: "Number of decimal places (default 2)",
      },
      {
        name: "no_commas",
        type: "boolean",
        description: "1 to suppress commas (default 0)",
      },
    ],
  },
  {
    name: "T",
    syntax: "T(value)",
    description: "Returns the text if value is text, otherwise empty string",
    example: "=T(A1)",
    category: "Text",
    params: [{ name: "value", type: "any", description: "Value to check" }],
  },
  {
    name: "UNICODE",
    syntax: "UNICODE(text)",
    description: "Returns the Unicode code point of the first character",
    example: '=UNICODE("A")',
    category: "Text",
    params: [
      { name: "text", type: "text", description: "Text to get code from" },
    ],
  },
];
