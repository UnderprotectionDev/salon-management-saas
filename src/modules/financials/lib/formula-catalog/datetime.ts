import type { FormulaEntry } from "./types";

export const DATETIME_FORMULAS: FormulaEntry[] = [
  {
    name: "TODAY",
    syntax: "TODAY()",
    description: "Returns the current date",
    example: "=TODAY()",
    category: "Date/Time",
  },
  {
    name: "NOW",
    syntax: "NOW()",
    description: "Returns the current date and time",
    example: "=NOW()",
    category: "Date/Time",
  },
  {
    name: "DATE",
    syntax: "DATE(year, month, day)",
    description: "Creates a date from year, month, and day",
    example: "=DATE(2024, 1, 15)",
    category: "Date/Time",
    params: [
      { name: "year", type: "number", description: "Year" },
      { name: "month", type: "number", description: "Month (1-12)" },
      { name: "day", type: "number", description: "Day (1-31)" },
    ],
  },
  {
    name: "YEAR",
    syntax: "YEAR(date)",
    description: "Returns the year from a date",
    example: "=YEAR(A1)",
    category: "Date/Time",
    params: [{ name: "date", type: "date", description: "A date value" }],
  },
  {
    name: "MONTH",
    syntax: "MONTH(date)",
    description: "Returns the month from a date (1-12)",
    example: "=MONTH(A1)",
    category: "Date/Time",
    params: [{ name: "date", type: "date", description: "A date value" }],
  },
  {
    name: "DAY",
    syntax: "DAY(date)",
    description: "Returns the day from a date (1-31)",
    example: "=DAY(A1)",
    category: "Date/Time",
    params: [{ name: "date", type: "date", description: "A date value" }],
  },
  {
    name: "DATEDIF",
    syntax: "DATEDIF(start_date, end_date, unit)",
    description:
      'Returns the difference between two dates in days ("D"), months ("M"), or years ("Y")',
    example: '=DATEDIF("2024-01-01", "2024-12-31", "D")',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      { name: "end_date", type: "date", description: "End date" },
      {
        name: "unit",
        type: "text",
        description: '"D" for days, "M" for months, "Y" for years',
      },
    ],
  },
  {
    name: "NETWORKDAYS",
    syntax: "NETWORKDAYS(start_date, end_date)",
    description: "Returns number of working days between two dates (Mon-Fri)",
    example: '=NETWORKDAYS("2024-01-01", "2024-01-31")',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      { name: "end_date", type: "date", description: "End date" },
    ],
  },
  {
    name: "EDATE",
    syntax: "EDATE(start_date, months)",
    description:
      "Returns a date that is a given number of months before or after a date",
    example: '=EDATE("2024-01-15", 3)',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      {
        name: "months",
        type: "number",
        description: "Number of months to add (negative to subtract)",
      },
    ],
  },
  {
    name: "EOMONTH",
    syntax: "EOMONTH(start_date, months)",
    description:
      "Returns the last day of the month, a given number of months before or after a date",
    example: '=EOMONTH("2024-01-15", 0)',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      {
        name: "months",
        type: "number",
        description: "Number of months to add",
      },
    ],
  },
  {
    name: "HOUR",
    syntax: "HOUR(time)",
    description: "Returns the hour component of a time (0-23)",
    example: '=HOUR("14:30")',
    category: "Date/Time",
    params: [
      { name: "time", type: "text", description: "A time or datetime value" },
    ],
  },
  {
    name: "MINUTE",
    syntax: "MINUTE(time)",
    description: "Returns the minute component of a time (0-59)",
    example: '=MINUTE("14:30")',
    category: "Date/Time",
    params: [
      { name: "time", type: "text", description: "A time or datetime value" },
    ],
  },
  {
    name: "SECOND",
    syntax: "SECOND(time)",
    description: "Returns the second component of a time (0-59)",
    example: '=SECOND("14:30:45")',
    category: "Date/Time",
    params: [
      { name: "time", type: "text", description: "A time or datetime value" },
    ],
  },
  {
    name: "TIME",
    syntax: "TIME(hour, minute, second)",
    description: "Creates a time value from hour, minute, and second",
    example: "=TIME(14, 30, 0)",
    category: "Date/Time",
    params: [
      { name: "hour", type: "number", description: "Hour (0-23)" },
      { name: "minute", type: "number", description: "Minute (0-59)" },
      { name: "second", type: "number", description: "Second (0-59)" },
    ],
  },
  {
    name: "WEEKDAY",
    syntax: "WEEKDAY(date, return_type)",
    description:
      "Returns the day of the week (1=Sunday to 7=Saturday by default)",
    example: '=WEEKDAY("2024-01-15")',
    category: "Date/Time",
    params: [
      { name: "date", type: "date", description: "A date value" },
      {
        name: "return_type",
        type: "number",
        description: "1=Sun-Sat, 2=Mon-Sun, 3=Mon=0 (optional)",
      },
    ],
  },
  {
    name: "WEEKNUM",
    syntax: "WEEKNUM(date)",
    description: "Returns the week number of the year (1-52)",
    example: '=WEEKNUM("2024-03-15")',
    category: "Date/Time",
    params: [{ name: "date", type: "date", description: "A date value" }],
  },
  {
    name: "WORKDAY",
    syntax: "WORKDAY(start_date, days)",
    description:
      "Returns a date that is a given number of working days from start",
    example: '=WORKDAY("2024-01-15", 10)',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      {
        name: "days",
        type: "number",
        description: "Number of working days to add",
      },
    ],
  },
  {
    name: "DAYS",
    syntax: "DAYS(end_date, start_date)",
    description: "Returns the number of days between two dates",
    example: '=DAYS("2024-12-31", "2024-01-01")',
    category: "Date/Time",
    params: [
      { name: "end_date", type: "date", description: "End date" },
      { name: "start_date", type: "date", description: "Start date" },
    ],
  },
  {
    name: "DATEVALUE",
    syntax: "DATEVALUE(date_text)",
    description:
      "Converts a date text string to a date serial number (days since epoch)",
    example: '=DATEVALUE("2024-06-15")',
    category: "Date/Time",
    params: [
      { name: "date_text", type: "text", description: "Date as text string" },
    ],
  },
  {
    name: "TIMEVALUE",
    syntax: "TIMEVALUE(time_text)",
    description: "Converts a time text string to a decimal fraction of a day",
    example: '=TIMEVALUE("12:30:00")',
    category: "Date/Time",
    params: [
      { name: "time_text", type: "text", description: "Time as text string" },
    ],
  },
  {
    name: "YEARFRAC",
    syntax: "YEARFRAC(start_date, end_date)",
    description: "Returns the year fraction between two dates",
    example: '=YEARFRAC("2024-01-01", "2024-07-01")',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      { name: "end_date", type: "date", description: "End date" },
    ],
  },
  {
    name: "DAYS360",
    syntax: "DAYS360(start_date, end_date, method)",
    description:
      "Returns the number of days between two dates based on a 360-day year",
    example: '=DAYS360("2024-01-01", "2024-12-31")',
    category: "Date/Time",
    params: [
      { name: "start_date", type: "date", description: "Start date" },
      { name: "end_date", type: "date", description: "End date" },
      {
        name: "method",
        type: "boolean",
        description: "0 for US method (default), 1 for European",
      },
    ],
  },
];
