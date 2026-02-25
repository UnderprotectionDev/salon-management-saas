import type { VariantOption } from "../components/VariantOptionsEditor";

/** Separator used in variant stock map keys to avoid collisions with user data. */
const KEY_SEP = "\0";

/** Build a composite key for variant stock lookups. */
export function variantStockKey(optionName: string, value: string): string {
  return `${optionName}${KEY_SEP}${value}`;
}

/**
 * Build a map of optionName+value → total stock across all variants.
 * Used in edit mode to determine which values can be safely removed.
 */
export function buildVariantStockMap(
  variants: Array<{
    optionValues: Array<{ optionName: string; value: string }>;
    stockQuantity: number;
  }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of variants) {
    for (const ov of v.optionValues) {
      const key = variantStockKey(ov.optionName, ov.value);
      map.set(key, (map.get(key) ?? 0) + v.stockQuantity);
    }
  }
  return map;
}

/**
 * Check if variant options have changed (for edit mode submit logic).
 */
export function optionsChanged(
  oldOptions: VariantOption[],
  newOptions: VariantOption[],
): boolean {
  if (oldOptions.length !== newOptions.length) return true;
  for (let i = 0; i < oldOptions.length; i++) {
    if (oldOptions[i].name !== newOptions[i].name) return true;
    if (oldOptions[i].values.length !== newOptions[i].values.length) return true;
    for (let j = 0; j < oldOptions[i].values.length; j++) {
      if (oldOptions[i].values[j] !== newOptions[i].values[j]) return true;
    }
  }
  return false;
}
