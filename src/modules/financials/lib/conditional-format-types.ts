/** Types of conditional formatting rules */
export type CondFormatRuleType =
  | "value"
  | "colorScale"
  | "dataBar"
  | "iconSet"
  | "formula"
  | "duplicates"
  | "topBottom";

/** Comparison operators for value-based rules */
export type CondFormatOperator =
  | "greaterThan"
  | "lessThan"
  | "equal"
  | "notEqual"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "between"
  | "notBetween"
  | "contains"
  | "notContains"
  | "beginsWith"
  | "endsWith";

/** Cell style applied by conditional formatting */
export interface CondFormatStyle {
  bgColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
}

/** Color scale configuration (2 or 3 colors) */
export interface ColorScaleConfig {
  minColor: string;
  midColor?: string;
  maxColor: string;
}

/** Data bar configuration */
export interface DataBarConfig {
  color: string;
  showValue?: boolean;
}

/** Icon set configuration */
export interface IconSetConfig {
  iconType: "arrows" | "circles" | "flags" | "stars";
  thresholds: number[];
}

/** A conditional formatting rule */
export interface CondFormatRule {
  id: string;
  type: CondFormatRuleType;
  /** Range the rule applies to (e.g. "A1:C10") */
  range: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Operator for value comparison */
  operator?: CondFormatOperator;
  /** Primary comparison value */
  value1?: string;
  /** Secondary value (for between) */
  value2?: string;
  /** Style to apply when condition is met */
  format?: CondFormatStyle;
  /** Color scale configuration */
  colorScale?: ColorScaleConfig;
  /** Data bar configuration */
  dataBar?: DataBarConfig;
  /** Icon set configuration */
  iconSet?: IconSetConfig;
  /** Formula that must return TRUE */
  formula?: string;
  /** For topBottom: top/bottom count or percent */
  topBottomValue?: number;
  topBottomType?: "top" | "bottom";
  topBottomPercent?: boolean;
  /** Stop processing subsequent rules if this rule matches */
  stopIfTrue?: boolean;
}

/** Resolved conditional style for a cell */
export interface CellConditionalStyle {
  bgColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  dataBarPercent?: number;
  dataBarColor?: string;
  icon?: string;
}
