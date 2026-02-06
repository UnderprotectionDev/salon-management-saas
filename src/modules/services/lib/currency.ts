export function formatPrice(priceInKurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(priceInKurus / 100);
}

export function kurusToLira(kurus: number): number {
  return kurus / 100;
}

export function liraToKurus(lira: number): number {
  return Math.round(lira * 100);
}
