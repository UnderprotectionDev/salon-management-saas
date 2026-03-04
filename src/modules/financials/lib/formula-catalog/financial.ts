import type { FormulaEntry } from "./types";

export const FINANCIAL_FORMULAS: FormulaEntry[] = [
  {
    name: "PMT",
    syntax: "PMT(rate, nper, pv)",
    description:
      "Calculates the periodic payment for a loan with constant payments and interest rate",
    example: "=PMT(0.05/12, 360, 100000)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      {
        name: "nper",
        type: "number",
        description: "Total number of payment periods",
      },
      {
        name: "pv",
        type: "number",
        description: "Present value (loan amount)",
      },
    ],
  },
  {
    name: "FV",
    syntax: "FV(rate, nper, pmt, [pv])",
    description: "Returns the future value of an investment",
    example: "=FV(0.05/12, 120, -500, -10000)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "nper", type: "number", description: "Number of periods" },
      { name: "pmt", type: "number", description: "Payment per period" },
      {
        name: "pv",
        type: "number",
        description: "Present value (optional, default 0)",
      },
    ],
  },
  {
    name: "PV",
    syntax: "PV(rate, nper, pmt)",
    description: "Returns the present value of an investment",
    example: "=PV(0.05/12, 120, -500)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "nper", type: "number", description: "Number of periods" },
      { name: "pmt", type: "number", description: "Payment per period" },
    ],
  },
  {
    name: "NPV",
    syntax: "NPV(rate, range)",
    description: "Returns the net present value of a series of cash flows",
    example: "=NPV(0.1, A1:A5)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Discount rate" },
      { name: "range", type: "range", description: "Range of cash flows" },
    ],
  },
  {
    name: "IRR",
    syntax: "IRR(range)",
    description:
      "Returns the internal rate of return for a series of cash flows",
    example: "=IRR(A1:A5)",
    category: "Financial",
    params: [
      {
        name: "range",
        type: "range",
        description: "Range of cash flows (must include negative and positive)",
      },
    ],
  },
  {
    name: "RATE",
    syntax: "RATE(nper, pmt, pv)",
    description: "Returns the interest rate per period of a loan or investment",
    example: "=RATE(120, -500, 40000)",
    category: "Financial",
    params: [
      { name: "nper", type: "number", description: "Total number of periods" },
      { name: "pmt", type: "number", description: "Payment per period" },
      { name: "pv", type: "number", description: "Present value" },
    ],
  },
  {
    name: "NPER",
    syntax: "NPER(rate, pmt, pv)",
    description: "Returns the number of periods for a loan or investment",
    example: "=NPER(0.05/12, -500, 40000)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "pmt", type: "number", description: "Payment per period" },
      { name: "pv", type: "number", description: "Present value" },
    ],
  },
  {
    name: "IPMT",
    syntax: "IPMT(rate, per, nper, pv)",
    description: "Returns the interest portion of a payment for a given period",
    example: "=IPMT(0.05/12, 1, 360, 100000)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "per", type: "number", description: "The period (1-based)" },
      { name: "nper", type: "number", description: "Total number of periods" },
      { name: "pv", type: "number", description: "Present value" },
    ],
  },
  {
    name: "PPMT",
    syntax: "PPMT(rate, per, nper, pv)",
    description:
      "Returns the principal portion of a payment for a given period",
    example: "=PPMT(0.05/12, 1, 360, 100000)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "per", type: "number", description: "The period (1-based)" },
      { name: "nper", type: "number", description: "Total number of periods" },
      { name: "pv", type: "number", description: "Present value" },
    ],
  },
  {
    name: "SLN",
    syntax: "SLN(cost, salvage, life)",
    description:
      "Returns the straight-line depreciation of an asset for one period",
    example: "=SLN(10000, 1000, 5)",
    category: "Financial",
    params: [
      {
        name: "cost",
        type: "number",
        description: "Initial cost of the asset",
      },
      {
        name: "salvage",
        type: "number",
        description: "Salvage value at end of life",
      },
      {
        name: "life",
        type: "number",
        description: "Number of depreciation periods",
      },
    ],
  },
  {
    name: "DDB",
    syntax: "DDB(cost, salvage, life, period)",
    description:
      "Returns double-declining balance depreciation for a specific period",
    example: "=DDB(10000, 1000, 5, 1)",
    category: "Financial",
    params: [
      { name: "cost", type: "number", description: "Initial cost" },
      { name: "salvage", type: "number", description: "Salvage value" },
      { name: "life", type: "number", description: "Useful life" },
      {
        name: "period",
        type: "number",
        description: "The period to calculate",
      },
    ],
  },
  {
    name: "DB",
    syntax: "DB(cost, salvage, life, period)",
    description:
      "Returns fixed-declining balance depreciation for a specific period",
    example: "=DB(10000, 1000, 5, 1)",
    category: "Financial",
    params: [
      { name: "cost", type: "number", description: "Initial cost" },
      { name: "salvage", type: "number", description: "Salvage value" },
      { name: "life", type: "number", description: "Useful life" },
      {
        name: "period",
        type: "number",
        description: "The period to calculate",
      },
    ],
  },
  {
    name: "CUMPRINC",
    syntax: "CUMPRINC(rate, nper, pv, start, end)",
    description:
      "Returns cumulative principal paid on a loan between two periods (assumes end-of-period payments)",
    example: "=CUMPRINC(0.05/12, 360, 100000, 1, 12)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "nper", type: "number", description: "Total number of periods" },
      { name: "pv", type: "number", description: "Present value" },
      { name: "start", type: "number", description: "First period (1-based)" },
      { name: "end", type: "number", description: "Last period" },
    ],
  },
  {
    name: "CUMIPMT",
    syntax: "CUMIPMT(rate, nper, pv, start, end)",
    description:
      "Returns cumulative interest paid on a loan between two periods (assumes end-of-period payments)",
    example: "=CUMIPMT(0.05/12, 360, 100000, 1, 12)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Interest rate per period" },
      { name: "nper", type: "number", description: "Total number of periods" },
      { name: "pv", type: "number", description: "Present value" },
      { name: "start", type: "number", description: "First period (1-based)" },
      { name: "end", type: "number", description: "Last period" },
    ],
  },
  {
    name: "XNPV",
    syntax: "XNPV(rate, values, dates)",
    description:
      "Returns the net present value for a schedule of cash flows with irregular dates",
    example: "=XNPV(0.1, A1:A5, B1:B5)",
    category: "Financial",
    params: [
      { name: "rate", type: "number", description: "Discount rate" },
      { name: "values", type: "range", description: "Cash flow values" },
      { name: "dates", type: "range", description: "Dates for each cash flow" },
    ],
  },
  {
    name: "XIRR",
    syntax: "XIRR(values, dates)",
    description:
      "Returns the internal rate of return for cash flows with irregular dates",
    example: "=XIRR(A1:A5, B1:B5)",
    category: "Financial",
    params: [
      { name: "values", type: "range", description: "Cash flow values" },
      { name: "dates", type: "range", description: "Dates for each cash flow" },
    ],
  },
  {
    name: "MIRR",
    syntax: "MIRR(values, finance_rate, reinvest_rate)",
    description:
      "Returns the modified internal rate of return for a series of cash flows",
    example: "=MIRR(A1:A5, 0.1, 0.12)",
    category: "Financial",
    params: [
      { name: "values", type: "range", description: "Cash flow values" },
      {
        name: "finance_rate",
        type: "number",
        description: "Interest rate on borrowed funds",
      },
      {
        name: "reinvest_rate",
        type: "number",
        description: "Interest rate on reinvested cash flows",
      },
    ],
  },
  {
    name: "EFFECT",
    syntax: "EFFECT(nominal_rate, npery)",
    description: "Returns the effective annual interest rate",
    example: "=EFFECT(0.1, 4)",
    category: "Financial",
    params: [
      {
        name: "nominal_rate",
        type: "number",
        description: "Nominal annual interest rate",
      },
      {
        name: "npery",
        type: "number",
        description: "Number of compounding periods per year",
      },
    ],
  },
  {
    name: "NOMINAL",
    syntax: "NOMINAL(effect_rate, npery)",
    description: "Returns the nominal annual interest rate",
    example: "=NOMINAL(0.1038, 4)",
    category: "Financial",
    params: [
      {
        name: "effect_rate",
        type: "number",
        description: "Effective annual interest rate",
      },
      {
        name: "npery",
        type: "number",
        description: "Number of compounding periods per year",
      },
    ],
  },
  {
    name: "DISC",
    syntax: "DISC(settlement, maturity, price, redemption)",
    description: "Returns the discount rate for a security",
    example: '=DISC("2024-01-01", "2024-12-31", 95, 100)',
    category: "Financial",
    params: [
      { name: "settlement", type: "date", description: "Settlement date" },
      { name: "maturity", type: "date", description: "Maturity date" },
      {
        name: "price",
        type: "number",
        description: "Security price per $100 face",
      },
      {
        name: "redemption",
        type: "number",
        description: "Redemption value per $100 face",
      },
    ],
  },
];
