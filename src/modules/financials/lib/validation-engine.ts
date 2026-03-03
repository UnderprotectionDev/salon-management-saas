import type { CellMap } from "./spreadsheet-types";
import { evalFormula } from "./spreadsheet-formula";
import type {
  ValidationOperator,
  ValidationResult,
  ValidationRule,
} from "./validation-types";

const EPSILON = 1e-10;

/** Compare two numbers using an operator */
function compareNumbers(
  value: number,
  operator: ValidationOperator,
  val1: number,
  val2?: number,
): boolean {
  switch (operator) {
    case "between":
      return val2 !== undefined && value >= val1 - EPSILON && value <= val2 + EPSILON;
    case "notBetween":
      return val2 !== undefined && (value < val1 - EPSILON || value > val2 + EPSILON);
    case "equal":
      return Math.abs(value - val1) < EPSILON;
    case "notEqual":
      return Math.abs(value - val1) >= EPSILON;
    case "greaterThan":
      return value > val1;
    case "lessThan":
      return value < val1;
    case "greaterThanOrEqual":
      return value >= val1;
    case "lessThanOrEqual":
      return value <= val1;
    default:
      return true;
  }
}

/**
 * Validate a cell value against a validation rule.
 * Returns { valid: true } if no rule or value passes.
 */
export function validateCell(
  value: string,
  rule: ValidationRule | undefined,
  cells: CellMap,
  _cellRef: string,
): ValidationResult {
  if (!rule) return { valid: true };
  if (value === "") return { valid: true }; // Empty cells always pass

  const makeResult = (valid: boolean): ValidationResult => ({
    valid,
    message: valid ? undefined : rule.errorMessage || getDefaultMessage(rule),
    warningOnly: rule.warningOnly,
  });

  switch (rule.type) {
    case "dropdown": {
      if (!rule.dropdownValues) return { valid: true };
      const options = rule.dropdownValues.split(",").map((s) => s.trim());
      return makeResult(options.includes(value));
    }

    case "number": {
      const num = Number.parseFloat(value);
      if (Number.isNaN(num)) return makeResult(false);
      if (rule.integerOnly && !Number.isInteger(num)) return makeResult(false);
      if (rule.positiveOnly && num <= 0) return makeResult(false);

      if (rule.operator && rule.value1 !== undefined) {
        const v1 = Number.parseFloat(rule.value1);
        const v2 =
          rule.value2 !== undefined
            ? Number.parseFloat(rule.value2)
            : undefined;
        if (Number.isNaN(v1)) return { valid: true };
        return makeResult(compareNumbers(num, rule.operator, v1, v2));
      }
      return { valid: true };
    }

    case "date": {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return makeResult(false);

      if (rule.operator && rule.value1) {
        const d1 = new Date(rule.value1).getTime();
        const d2 = rule.value2 ? new Date(rule.value2).getTime() : undefined;
        if (Number.isNaN(d1)) return { valid: true };
        return makeResult(
          compareNumbers(date.getTime(), rule.operator, d1, d2),
        );
      }
      return { valid: true };
    }

    case "textLength": {
      const len = value.length;
      if (rule.operator && rule.value1 !== undefined) {
        const v1 = Number.parseInt(rule.value1, 10);
        const v2 =
          rule.value2 !== undefined
            ? Number.parseInt(rule.value2, 10)
            : undefined;
        if (Number.isNaN(v1)) return { valid: true };
        return makeResult(compareNumbers(len, rule.operator, v1, v2));
      }
      return { valid: true };
    }

    case "custom": {
      if (!rule.formula) return { valid: true };
      const result = evalFormula(`=${rule.formula}`, cells);
      return makeResult(result.toUpperCase() === "TRUE" || result === "1");
    }

    default:
      return { valid: true };
  }
}

function getDefaultMessage(rule: ValidationRule): string {
  switch (rule.type) {
    case "dropdown":
      return "Please select from the dropdown list";
    case "number":
      return "Please enter a valid number";
    case "date":
      return "Please enter a valid date";
    case "textLength":
      return "Text length is out of the allowed range";
    case "custom":
      return "Value does not meet the validation criteria";
    default:
      return "Invalid value";
  }
}
