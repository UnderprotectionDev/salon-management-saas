export type { FormulaCategory, FormulaEntry, FormulaParam } from "./types";

import { CONVERSION_FORMULAS } from "./conversion";
import { DATETIME_FORMULAS } from "./datetime";
import { FINANCIAL_FORMULAS } from "./financial";
import { LOGICAL_FORMULAS } from "./logical";
import { LOOKUP_FORMULAS } from "./lookup";
import { MATH_FORMULAS } from "./math";
import { SALON_FORMULAS } from "./salon";
import { STATISTICS_FORMULAS } from "./statistics";
import { TEXT_FORMULAS } from "./text";

import type { FormulaCategory, FormulaEntry } from "./types";

export {
  MATH_FORMULAS,
  STATISTICS_FORMULAS,
  TEXT_FORMULAS,
  DATETIME_FORMULAS,
  LOGICAL_FORMULAS,
  LOOKUP_FORMULAS,
  FINANCIAL_FORMULAS,
  CONVERSION_FORMULAS,
  SALON_FORMULAS,
};

export const FORMULA_CATALOG: FormulaEntry[] = [
  ...MATH_FORMULAS,
  ...STATISTICS_FORMULAS,
  ...TEXT_FORMULAS,
  ...DATETIME_FORMULAS,
  ...LOGICAL_FORMULAS,
  ...LOOKUP_FORMULAS,
  ...FINANCIAL_FORMULAS,
  ...CONVERSION_FORMULAS,
  ...SALON_FORMULAS,
];

/** All formula function names for autocomplete */
export const FORMULA_NAMES = FORMULA_CATALOG.map((f) => f.name);

/** Get categories with their formulas */
export function getFormulasByCategory(): Record<
  FormulaCategory,
  FormulaEntry[]
> {
  const result: Record<FormulaCategory, FormulaEntry[]> = {
    Math: [],
    Statistics: [],
    Text: [],
    "Date/Time": [],
    Logical: [],
    Lookup: [],
    Financial: [],
    Conversion: [],
    Salon: [],
  };
  for (const f of FORMULA_CATALOG) {
    result[f.category].push(f);
  }
  return result;
}

/** Category display order */
export const CATEGORY_ORDER: FormulaCategory[] = [
  "Math",
  "Statistics",
  "Text",
  "Date/Time",
  "Logical",
  "Lookup",
  "Financial",
  "Conversion",
  "Salon",
];

/** Salon formula subcategories for the Salon Formulas tab */
export const SALON_SUBCATEGORIES: {
  label: string;
  formulas: string[];
}[] = [
  {
    label: "KDV (VAT)",
    formulas: ["KDV_HESAPLA", "KDV_DAHIL", "KDV_HARIC"],
  },
  {
    label: "Performans",
    formulas: [
      "KOMISYON",
      "KAR_MARJI",
      "PERSONEL_CIRO_ORT",
      "SAAT_BASINA_GELIR",
      "NOSHOW_ORANI",
      "PERSONEL_PRIM",
      "PERSONEL_VERIMLILIK",
    ],
  },
  {
    label: "Musteri",
    formulas: [
      "MUSTERI_ORT_HARCAMA",
      "RETENTION_ORANI",
      "MUSTERI_KAZANIM_MALIYETI",
      "RANDEVU_ORTALAMA",
      "TEKRAR_ZIYARET_ORANI",
    ],
  },
  {
    label: "Is Metrikleri",
    formulas: [
      "DOLULUK_ORANI",
      "BUYUME_ORANI",
      "GUNLUK_CIRO",
      "HIZMET_ORANI",
      "AYLIK_GIDER_ORANI",
      "CIRO_HEDEFI_FARKI",
      "HAFTALIK_CIRO",
      "KOLTUK_BASINA_GELIR",
      "NET_KAR",
    ],
  },
  {
    label: "Randevu",
    formulas: ["ORTALAMA_HIZMET_SURESI", "IPTAL_ORANI"],
  },
  {
    label: "Envanter & Satis",
    formulas: [
      "STOK_DEVIR_HIZI",
      "URUN_KAR",
      "URUN_SATIS_ORANI",
      "KAMPANYA_ROI",
    ],
  },
];

/** Category icon names — resolved to Lucide components in the UI */
export const CATEGORY_ICONS: Record<FormulaCategory, string> = {
  Math: "Calculator",
  Statistics: "BarChart3",
  Text: "Type",
  "Date/Time": "Calendar",
  Logical: "GitBranch",
  Lookup: "Search",
  Financial: "Banknote",
  Conversion: "ArrowLeftRight",
  Salon: "Scissors",
};

/** Default favorite formulas */
export const DEFAULT_FAVORITES = [
  "SUM",
  "AVERAGE",
  "IF",
  "VLOOKUP",
  "KDV_HESAPLA",
];

/** localStorage key for favorites */
export const FAVORITES_STORAGE_KEY = "spreadsheet-formula-favorites";
