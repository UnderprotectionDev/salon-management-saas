export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "debit", label: "Debit Card" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "mobile", label: "Mobile Payment" },
  { value: "gift_card", label: "Gift Card" },
] as const;

export const RECURRENCE_OPTIONS = [
  { value: "one_time", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

export const REVENUE_TYPES = [
  { value: "product_sale", label: "Product Sale" },
  { value: "gift_card", label: "Gift Card Sale" },
  { value: "tip", label: "Tip" },
  { value: "other", label: "Other" },
] as const;

export function getPaymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export function getRecurrenceLabel(value: string): string {
  return RECURRENCE_OPTIONS.find((r) => r.value === value)?.label ?? value;
}

export function getRevenueTypeLabel(value: string): string {
  return REVENUE_TYPES.find((t) => t.value === value)?.label ?? value;
}
