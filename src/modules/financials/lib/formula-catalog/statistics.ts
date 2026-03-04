import type { FormulaEntry } from "./types";

export const STATISTICS_FORMULAS: FormulaEntry[] = [
  {
    name: "AVERAGE",
    syntax: "AVERAGE(range)",
    description: "Returns the arithmetic mean of the values",
    example: "=AVERAGE(A1:A10)",
    category: "Statistics",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range of cells to average",
      },
    ],
  },
  {
    name: "COUNT",
    syntax: "COUNT(range)",
    description: "Counts cells that contain numbers",
    example: "=COUNT(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of cells to count" },
    ],
  },
  {
    name: "COUNTA",
    syntax: "COUNTA(range)",
    description: "Counts non-empty cells",
    example: "=COUNTA(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of cells to count" },
    ],
  },
  {
    name: "MIN",
    syntax: "MIN(range)",
    description: "Returns the smallest value",
    example: "=MIN(A1:A10)",
    category: "Statistics",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range to find minimum in",
      },
    ],
  },
  {
    name: "MAX",
    syntax: "MAX(range)",
    description: "Returns the largest value",
    example: "=MAX(A1:A10)",
    category: "Statistics",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range to find maximum in",
      },
    ],
  },
  {
    name: "SUMIF",
    syntax: "SUMIF(range, criteria, sum_range)",
    description: "Sums cells that match a condition",
    example: '=SUMIF(A1:A10, ">100", B1:B10)',
    category: "Statistics",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range to evaluate criteria against",
      },
      {
        name: "criteria",
        type: "text",
        description: "Condition to match",
        example: '">100"',
      },
      {
        name: "sum_range",
        type: "range",
        description: "Range to sum (optional, defaults to range)",
      },
    ],
  },
  {
    name: "COUNTIF",
    syntax: "COUNTIF(range, criteria)",
    description: "Counts cells that match a condition",
    example: '=COUNTIF(A1:A10, ">0")',
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range to evaluate" },
      {
        name: "criteria",
        type: "text",
        description: "Condition to match",
        example: '">0"',
      },
    ],
  },
  {
    name: "MEDIAN",
    syntax: "MEDIAN(range)",
    description: "Returns the median (middle value) of a dataset",
    example: "=MEDIAN(A1:A10)",
    category: "Statistics",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range of numeric values",
      },
    ],
  },
  {
    name: "STDEV",
    syntax: "STDEV(range)",
    description: "Returns the standard deviation of a sample",
    example: "=STDEV(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
    ],
  },
  {
    name: "VAR",
    syntax: "VAR(range)",
    description: "Returns the variance of a sample",
    example: "=VAR(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
    ],
  },
  {
    name: "PERCENTILE",
    syntax: "PERCENTILE(range, k)",
    description: "Returns the k-th percentile of values in a range",
    example: "=PERCENTILE(A1:A10, 0.9)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
      {
        name: "k",
        type: "number",
        description: "Percentile value between 0 and 1",
        example: "0.9",
      },
    ],
  },
  {
    name: "LARGE",
    syntax: "LARGE(range, k)",
    description: "Returns the k-th largest value in a dataset",
    example: "=LARGE(A1:A10, 2)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
      {
        name: "k",
        type: "number",
        description: "Position from largest (1 = largest)",
        example: "2",
      },
    ],
  },
  {
    name: "SMALL",
    syntax: "SMALL(range, k)",
    description: "Returns the k-th smallest value in a dataset",
    example: "=SMALL(A1:A10, 2)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
      {
        name: "k",
        type: "number",
        description: "Position from smallest (1 = smallest)",
        example: "2",
      },
    ],
  },
  {
    name: "AVERAGEIF",
    syntax: "AVERAGEIF(range, criteria, average_range)",
    description: "Averages cells that match a condition",
    example: '=AVERAGEIF(A1:A10, ">50", B1:B10)',
    category: "Statistics",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range to evaluate criteria against",
      },
      {
        name: "criteria",
        type: "text",
        description: "Condition to match",
        example: '">50"',
      },
      {
        name: "average_range",
        type: "range",
        description: "Range to average (optional)",
      },
    ],
  },
  {
    name: "AVERAGEIFS",
    syntax: "AVERAGEIFS(avg_range, range1, criteria1, ...)",
    description: "Averages cells that match multiple conditions",
    example: '=AVERAGEIFS(C1:C10, A1:A10, ">50", B1:B10, "<100")',
    category: "Statistics",
    params: [
      { name: "avg_range", type: "range", description: "Range to average" },
      { name: "range1", type: "range", description: "First criteria range" },
      { name: "criteria1", type: "text", description: "First condition" },
    ],
  },
  {
    name: "SUMIFS",
    syntax: "SUMIFS(sum_range, range1, criteria1, ...)",
    description: "Sums cells that match multiple conditions",
    example: '=SUMIFS(C1:C10, A1:A10, ">50", B1:B10, "<100")',
    category: "Statistics",
    params: [
      { name: "sum_range", type: "range", description: "Range to sum" },
      { name: "range1", type: "range", description: "First criteria range" },
      { name: "criteria1", type: "text", description: "First condition" },
    ],
  },
  {
    name: "COUNTIFS",
    syntax: "COUNTIFS(range1, criteria1, range2, criteria2, ...)",
    description: "Counts cells that match multiple conditions",
    example: '=COUNTIFS(A1:A10, ">50", B1:B10, "<100")',
    category: "Statistics",
    params: [
      { name: "range1", type: "range", description: "First criteria range" },
      { name: "criteria1", type: "text", description: "First condition" },
      { name: "range2", type: "range", description: "Second criteria range" },
      { name: "criteria2", type: "text", description: "Second condition" },
    ],
  },
  {
    name: "MODE",
    syntax: "MODE(range)",
    description: "Returns the most frequently occurring value",
    example: "=MODE(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
    ],
  },
  {
    name: "RANK",
    syntax: "RANK(number, range, order)",
    description: "Returns the rank of a number in a list",
    example: "=RANK(A1, A1:A10, 0)",
    category: "Statistics",
    params: [
      { name: "number", type: "number", description: "The number to rank" },
      { name: "range", type: "range", description: "Range of values" },
      {
        name: "order",
        type: "number",
        description: "0 for descending, 1 for ascending",
      },
    ],
  },
  {
    name: "CORREL",
    syntax: "CORREL(range1, range2)",
    description: "Returns the correlation coefficient between two datasets",
    example: "=CORREL(A1:A10, B1:B10)",
    category: "Statistics",
    params: [
      { name: "range1", type: "range", description: "First dataset" },
      { name: "range2", type: "range", description: "Second dataset" },
    ],
  },
  {
    name: "FORECAST",
    syntax: "FORECAST(x, known_y, known_x)",
    description: "Predicts a value using linear regression",
    example: "=FORECAST(15, A1:A10, B1:B10)",
    category: "Statistics",
    params: [
      { name: "x", type: "number", description: "The x-value to predict for" },
      { name: "known_y", type: "range", description: "Known y-values" },
      { name: "known_x", type: "range", description: "Known x-values" },
    ],
  },
  {
    name: "QUARTILE",
    syntax: "QUARTILE(range, quart)",
    description:
      "Returns the quartile of a dataset (0=min, 1=Q1, 2=median, 3=Q3, 4=max)",
    example: "=QUARTILE(A1:A10, 1)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
      { name: "quart", type: "number", description: "Quartile number (0-4)" },
    ],
  },
  {
    name: "FREQUENCY",
    syntax: "FREQUENCY(data_range, bins_range)",
    description: "Returns the frequency distribution as a comma-separated list",
    example: "=FREQUENCY(A1:A10, B1:B3)",
    category: "Statistics",
    params: [
      { name: "data_range", type: "range", description: "Data values" },
      { name: "bins_range", type: "range", description: "Bin boundary values" },
    ],
  },
  {
    name: "GEOMEAN",
    syntax: "GEOMEAN(range)",
    description: "Returns the geometric mean of positive values",
    example: "=GEOMEAN(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of positive values" },
    ],
  },
  {
    name: "HARMEAN",
    syntax: "HARMEAN(range)",
    description: "Returns the harmonic mean of positive values",
    example: "=HARMEAN(A1:A10)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of positive values" },
    ],
  },
  {
    name: "TRIMMEAN",
    syntax: "TRIMMEAN(range, percent)",
    description:
      "Returns the mean of the interior of a dataset, excluding a percentage of outliers",
    example: "=TRIMMEAN(A1:A20, 0.2)",
    category: "Statistics",
    params: [
      { name: "range", type: "range", description: "Range of numeric values" },
      {
        name: "percent",
        type: "number",
        description: "Fraction of data to exclude (0 to 1)",
        example: "0.2",
      },
    ],
  },
  {
    name: "SLOPE",
    syntax: "SLOPE(known_y, known_x)",
    description: "Returns the slope of the linear regression line",
    example: "=SLOPE(A1:A10, B1:B10)",
    category: "Statistics",
    params: [
      { name: "known_y", type: "range", description: "Known y-values" },
      { name: "known_x", type: "range", description: "Known x-values" },
    ],
  },
  {
    name: "INTERCEPT",
    syntax: "INTERCEPT(known_y, known_x)",
    description: "Returns the y-intercept of the linear regression line",
    example: "=INTERCEPT(A1:A10, B1:B10)",
    category: "Statistics",
    params: [
      { name: "known_y", type: "range", description: "Known y-values" },
      { name: "known_x", type: "range", description: "Known x-values" },
    ],
  },
];
