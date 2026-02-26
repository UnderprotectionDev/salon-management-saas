import { v } from "convex/values";
import { literals, typedV, withSystemFields } from "convex-helpers/validators";
import schema from "../../schema";

const vv = typedV(schema);

// =============================================================================
// AI Feature Validators (M10)
// =============================================================================

/** Salon type: all salon types + "multi" (used by AI features internally) */
export const salonTypeValidator = literals(
  "hair_women",
  "hair_men",
  "children",
  "braiding",
  "blowout_bar",
  "hair_extensions",
  "nail",
  "makeup",
  "skincare",
  "lash_brow",
  "permanent_makeup",
  "threading",
  "head_spa",
  "spa",
  "massage",
  "hammam",
  "sauna",
  "ayurveda",
  "float_therapy",
  "waxing",
  "tanning",
  "laser",
  "electrolysis",
  "medspa",
  "aesthetic_clinic",
  "cryotherapy",
  "iv_therapy",
  "body_contouring",
  "hair_loss",
  "tattoo",
  "piercing",
  "henna",
  "pet_grooming",
  "beauty_center",
  "multi",
);

/** Individual org salon type item (no "multi" — multi is derived when multiple selected) */
export const orgSalonTypeItemValidator = literals(
  "hair_women",
  "hair_men",
  "children",
  "braiding",
  "blowout_bar",
  "hair_extensions",
  "nail",
  "makeup",
  "skincare",
  "lash_brow",
  "permanent_makeup",
  "threading",
  "head_spa",
  "spa",
  "massage",
  "hammam",
  "sauna",
  "ayurveda",
  "float_therapy",
  "waxing",
  "tanning",
  "laser",
  "electrolysis",
  "medspa",
  "aesthetic_clinic",
  "cryotherapy",
  "iv_therapy",
  "body_contouring",
  "hair_loss",
  "tattoo",
  "piercing",
  "henna",
  "pet_grooming",
  "beauty_center",
);

/** Org salon types: array of selected types (multi-select) */
export const orgSalonTypesValidator = v.array(orgSalonTypeItemValidator);

/** AI credit pool type: customer (user-level global pool) */
export const aiCreditPoolTypeValidator = v.literal("customer");

/** AI credit transaction type: purchase | usage | refund */
export const aiCreditTransactionTypeValidator = literals(
  "purchase",
  "usage",
  "refund",
);

/** AI feature type (for credit transactions) */
export const aiFeatureTypeValidator = literals(
  "photoAnalysis",
  "quickQuestion",
  "virtualTryOn",
  "careSchedule",
);

/** AI analysis status */
export const aiAnalysisStatusValidator = literals(
  "pending",
  "processing",
  "completed",
  "failed",
);

/** AI simulation type: catalog | prompt */
export const aiSimulationTypeValidator = literals("catalog", "prompt");

/** AI care schedule status */
export const aiCareScheduleStatusValidator = literals(
  "active",
  "completed",
  "expired",
);

/** AI mood board source: analysis | tryon */
export const aiMoodBoardSourceValidator = literals("analysis", "tryon");

/** Design catalog status: active | inactive */
export const designCatalogStatusValidator = literals("active", "inactive");

// --- Document validators ---

/** AI Credits document validator */
export const aiCreditsDocValidator = vv.doc("aiCredits");

/** AI Credit Transaction document validator */
export const aiCreditTransactionDocValidator = vv.doc("aiCreditTransactions");

/** AI Analysis document validator */
export const aiAnalysisDocValidator = vv.doc("aiAnalyses");

/** AI Simulation document validator */
export const aiSimulationDocValidator = vv.doc("aiSimulations");

/** AI Care Schedule document validator */
export const aiCareScheduleDocValidator = vv.doc("aiCareSchedules");

/** AI Mood Board document validator */
export const aiMoodBoardDocValidator = vv.doc("aiMoodBoard");

/** Design Catalog document validator */
export const designCatalogDocValidator = vv.doc("designCatalog");

// --- Composite validators ---

/** Credit balance response (for getBalance query) */
export const aiCreditBalanceValidator = v.object({
  balance: v.number(),
  poolType: aiCreditPoolTypeValidator,
});

/** Credit transaction list item */
export const aiCreditTransactionItemValidator = v.object(
  withSystemFields("aiCreditTransactions", {
    ...schema.tables.aiCreditTransactions.validator.fields,
  }),
);

/** Care schedule recommendation item */
export const aiCareRecommendationValidator = v.object({
  title: v.string(),
  description: v.string(),
  recommendedDate: v.string(),
  serviceId: v.optional(vv.id("services")),
});

/** Design catalog item with image URL (for public browsing) */
export const designCatalogPublicValidator = v.object(
  withSystemFields("designCatalog", {
    ...schema.tables.designCatalog.validator.fields,
    imageUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  }),
);
