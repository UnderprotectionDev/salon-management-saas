type CommissionTier = {
  minRevenue: number;
  maxRevenue?: number;
  rate: number;
};

type CommissionSettings = {
  model: "fixed" | "tiered";
  fixedRate?: number;
  tiers?: CommissionTier[];
};

export function calculateCommission(
  settings: CommissionSettings,
  revenue: number,
): { rate: number; amount: number } {
  if (settings.model === "fixed" && settings.fixedRate !== undefined) {
    return {
      rate: settings.fixedRate,
      amount: Math.round((revenue * settings.fixedRate) / 100),
    };
  }

  if (settings.model === "tiered" && settings.tiers) {
    const sortedTiers = [...settings.tiers].sort((a, b) => b.minRevenue - a.minRevenue);
    for (const tier of sortedTiers) {
      if (revenue >= tier.minRevenue) {
        if (!tier.maxRevenue || revenue <= tier.maxRevenue) {
          return {
            rate: tier.rate,
            amount: Math.round((revenue * tier.rate) / 100),
          };
        }
      }
    }
  }

  return { rate: 0, amount: 0 };
}
