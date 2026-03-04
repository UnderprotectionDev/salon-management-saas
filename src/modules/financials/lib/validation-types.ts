/** Types of validation rules */
export type ValidationRuleType =
  | "dropdown"
  | "number"
  | "date"
  | "textLength"
  | "custom";

/** Comparison operators for number/date/textLength validation */
export type ValidationOperator =
  | "between"
  | "notBetween"
  | "equal"
  | "notEqual"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

/** A validation rule definition */
export interface ValidationRule {
  type: ValidationRuleType;
  /** Comparison operator (for number, date, textLength) */
  operator?: ValidationOperator;
  /** Primary comparison value */
  value1?: string;
  /** Secondary value (for between/notBetween) */
  value2?: string;
  /** Dropdown options (comma-separated for storage) */
  dropdownValues?: string;
  /** Require integers only (for number type) */
  integerOnly?: boolean;
  /** Require positive only (for number type) */
  positiveOnly?: boolean;
  /** Custom formula that must evaluate to TRUE */
  formula?: string;
  /** Error message shown to user */
  errorMessage?: string;
  /** If true, show as warning (yellow) instead of error (red) */
  warningOnly?: boolean;
}

/** Result of validating a cell */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  warningOnly?: boolean;
}
