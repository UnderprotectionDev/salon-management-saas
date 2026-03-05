/**
 * Shared currency utilities for Turkish Lira (TRY) formatting.
 * All prices are stored in kuruş (1/100 TL) in the database.
 */

/** Format kuruş amount as localized TRY currency string (e.g. "₺150,00") */
export function formatPrice(priceInKurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(priceInKurus / 100);
}

/** Convert kuruş to lira as a number (e.g. 15000 → 150) */
export function kurusToLira(kurus: number): number {
  return kurus / 100;
}

/** Convert kuruş to lira as a display string (e.g. 15000 → "150.00") */
export function kurusToLiraString(kurus: number): string {
  return (kurus / 100).toFixed(2);
}

/** Convert lira to kuruş. Accepts number or string input. */
export function liraToKurus(lira: number | string): number {
  const n = typeof lira === "string" ? Number.parseFloat(lira) : lira;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Format kuruş as compact currency (e.g. "₺150.00") - used in admin pages */
export function formatCurrency(kurus: number): string {
  return `₺${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}
