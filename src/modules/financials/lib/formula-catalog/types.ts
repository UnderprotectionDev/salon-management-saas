export interface FormulaParam {
  name: string;
  type: "number" | "range" | "text" | "date" | "boolean" | "any";
  description: string;
  example?: string;
}

export interface FormulaEntry {
  name: string;
  syntax: string;
  description: string;
  example: string;
  category: FormulaCategory;
  params?: FormulaParam[];
}

export type FormulaCategory =
  | "Math"
  | "Statistics"
  | "Text"
  | "Date/Time"
  | "Logical"
  | "Lookup"
  | "Financial"
  | "Conversion"
  | "Salon";
