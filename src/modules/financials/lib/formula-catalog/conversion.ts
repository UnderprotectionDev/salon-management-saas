import type { FormulaEntry } from "./types";

export const CONVERSION_FORMULAS: FormulaEntry[] = [
  {
    name: "ML_TO_OZ",
    syntax: "ML_TO_OZ(ml)",
    description: "Converts milliliters to fluid ounces",
    example: "=ML_TO_OZ(100)",
    category: "Conversion",
    params: [
      { name: "ml", type: "number", description: "Volume in milliliters" },
    ],
  },
  {
    name: "OZ_TO_ML",
    syntax: "OZ_TO_ML(oz)",
    description: "Converts fluid ounces to milliliters",
    example: "=OZ_TO_ML(3.38)",
    category: "Conversion",
    params: [
      { name: "oz", type: "number", description: "Volume in fluid ounces" },
    ],
  },
  {
    name: "KG_TO_LB",
    syntax: "KG_TO_LB(kg)",
    description: "Converts kilograms to pounds",
    example: "=KG_TO_LB(1)",
    category: "Conversion",
    params: [
      { name: "kg", type: "number", description: "Weight in kilograms" },
    ],
  },
  {
    name: "LB_TO_KG",
    syntax: "LB_TO_KG(lb)",
    description: "Converts pounds to kilograms",
    example: "=LB_TO_KG(2.2)",
    category: "Conversion",
    params: [{ name: "lb", type: "number", description: "Weight in pounds" }],
  },
  {
    name: "CM_TO_INCH",
    syntax: "CM_TO_INCH(cm)",
    description: "Converts centimeters to inches",
    example: "=CM_TO_INCH(10)",
    category: "Conversion",
    params: [
      { name: "cm", type: "number", description: "Length in centimeters" },
    ],
  },
  {
    name: "INCH_TO_CM",
    syntax: "INCH_TO_CM(inches)",
    description: "Converts inches to centimeters",
    example: "=INCH_TO_CM(4)",
    category: "Conversion",
    params: [
      { name: "inches", type: "number", description: "Length in inches" },
    ],
  },
  {
    name: "CELSIUS_TO_F",
    syntax: "CELSIUS_TO_F(celsius)",
    description: "Converts Celsius to Fahrenheit",
    example: "=CELSIUS_TO_F(100)",
    category: "Conversion",
    params: [
      {
        name: "celsius",
        type: "number",
        description: "Temperature in Celsius",
      },
    ],
  },
  {
    name: "F_TO_CELSIUS",
    syntax: "F_TO_CELSIUS(fahrenheit)",
    description: "Converts Fahrenheit to Celsius",
    example: "=F_TO_CELSIUS(212)",
    category: "Conversion",
    params: [
      {
        name: "fahrenheit",
        type: "number",
        description: "Temperature in Fahrenheit",
      },
    ],
  },
  {
    name: "DISCOUNT",
    syntax: "DISCOUNT(price, discount_percent)",
    description: "Returns the discounted price",
    example: "=DISCOUNT(100, 20)",
    category: "Conversion",
    params: [
      { name: "price", type: "number", description: "Original price" },
      {
        name: "discount_percent",
        type: "number",
        description: "Discount percentage",
      },
    ],
  },
  {
    name: "MARKUP",
    syntax: "MARKUP(cost, markup_percent)",
    description: "Returns the price after markup",
    example: "=MARKUP(100, 50)",
    category: "Conversion",
    params: [
      { name: "cost", type: "number", description: "Cost price" },
      {
        name: "markup_percent",
        type: "number",
        description: "Markup percentage",
      },
    ],
  },
  {
    name: "TAX_INCLUSIVE",
    syntax: "TAX_INCLUSIVE(price, tax_rate)",
    description: "Returns the price with tax included",
    example: "=TAX_INCLUSIVE(100, 18)",
    category: "Conversion",
    params: [
      { name: "price", type: "number", description: "Net price" },
      { name: "tax_rate", type: "number", description: "Tax rate percentage" },
    ],
  },
  {
    name: "USD_TO_TRY",
    syntax: "USD_TO_TRY(amount, rate)",
    description: "Converts USD to Turkish Lira using given exchange rate",
    example: "=USD_TO_TRY(100, 32.5)",
    category: "Conversion",
    params: [
      { name: "amount", type: "number", description: "Amount in USD" },
      { name: "rate", type: "number", description: "USD/TRY exchange rate" },
    ],
  },
  {
    name: "EUR_TO_TRY",
    syntax: "EUR_TO_TRY(amount, rate)",
    description: "Converts EUR to Turkish Lira using given exchange rate",
    example: "=EUR_TO_TRY(100, 35.2)",
    category: "Conversion",
    params: [
      { name: "amount", type: "number", description: "Amount in EUR" },
      { name: "rate", type: "number", description: "EUR/TRY exchange rate" },
    ],
  },
  {
    name: "GBP_TO_TRY",
    syntax: "GBP_TO_TRY(amount, rate)",
    description: "Converts GBP to Turkish Lira using given exchange rate",
    example: "=GBP_TO_TRY(100, 41.0)",
    category: "Conversion",
    params: [
      { name: "amount", type: "number", description: "Amount in GBP" },
      { name: "rate", type: "number", description: "GBP/TRY exchange rate" },
    ],
  },
];
