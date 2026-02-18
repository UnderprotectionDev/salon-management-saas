/**
 * AI-specific validators used in schema.ts, validators.ts, and functions.
 *
 * Kept in a separate file to avoid circular dependency:
 *   validators.ts → schema.ts (already)
 *   schema.ts → aiValidators.ts → convex/values (no cycle)
 */

import { v } from "convex/values";

// =============================================================================
// Analysis Result
// =============================================================================

/**
 * Typed validator for the structured AI analysis result.
 * Mirrors the Zod schema in aiActions.tsx (analysisResultSchema).
 */
export const aiAnalysisResultValidator = v.object({
  features: v.array(
    v.object({
      name: v.string(),
      value: v.string(),
      description: v.string(),
    }),
  ),
  recommendedServices: v.array(
    v.object({
      // New format: AI returns service ID from catalog map
      serviceId: v.optional(v.string()),
      // Legacy format: old docs stored service name as string
      serviceName: v.optional(v.string()),
      reason: v.string(),
    }),
  ),
  careTips: v.array(
    v.object({
      title: v.string(),
      description: v.string(),
    }),
  ),
  productRecommendations: v.array(
    v.object({
      productName: v.string(),
      reason: v.string(),
    }),
  ),
  summary: v.string(),
});

// =============================================================================
// Quick Answers
// =============================================================================

/**
 * Validator for the quick answers map: { [questionKey]: answerString }
 * Special values: "__loading__" (pending), "__error__" (failed).
 */
export const aiQuickAnswersValidator = v.record(v.string(), v.string());
