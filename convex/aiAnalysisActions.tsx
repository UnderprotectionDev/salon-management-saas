"use node";

/**
 * AI Analysis Actions — Photo analysis and quick questions.
 * Extracted from aiActions.tsx for single-responsibility.
 */

import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { extractErrorMessage, withRetry } from "./aiHelpers";
import { photoAnalysisAgent, quickQuestionAgent } from "./lib/agents";
import { ANALYSIS_FOCUS_BY_TYPE, CREDIT_COSTS } from "./lib/aiConstants";
import { ErrorCode } from "./lib/functions";

// =============================================================================
// Zod Schemas for Structured AI Output
// =============================================================================

/** Analysis result schema shared across all salon types */
const analysisResultSchema = z.object({
  features: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Feature name (e.g., 'Face Shape', 'Hair Type')"),
        value: z.string().describe("Assessed value (e.g., 'Oval', 'Wavy')"),
        description: z.string().describe("Brief explanation of the assessment"),
      }),
    )
    .describe("Salon-type-specific feature assessments"),
  recommendedServices: z
    .array(
      z.object({
        serviceId: z
          .string()
          .describe(
            "The exact service ID from the catalog map provided in the prompt",
          ),
        reason: z.string().describe("Why this service is recommended"),
      }),
    )
    .describe(
      "Services from the salon catalog that match the analysis. Only include services whose ID appears in the catalog map.",
    ),
  careTips: z
    .array(
      z.object({
        title: z.string().describe("Short tip title"),
        description: z.string().describe("Detailed care advice"),
      }),
    )
    .describe("Home care tips based on the analysis"),
  productRecommendations: z
    .array(
      z.object({
        productName: z.string().describe("General product type or name"),
        reason: z.string().describe("Why this product is recommended"),
      }),
    )
    .describe("General product suggestions based on analysis"),
  summary: z
    .string()
    .describe(
      "A brief overall summary of the analysis in 2-3 encouraging sentences",
    ),
});

// =============================================================================
// Photo Analysis Action
// =============================================================================

/**
 * Run GPT-4o vision analysis on uploaded photo(s).
 * Called by scheduler after createAnalysis mutation.
 *
 * Flow: pending → processing → completed | failed
 * On failure: refunds credits automatically.
 */
export const runPhotoAnalysis = internalAction({
  args: {
    analysisId: v.id("aiAnalyses"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch the analysis record
    const analysis = await ctx.runQuery(
      internal.aiAnalysis.getAnalysisInternal,
      { analysisId: args.analysisId },
    );

    if (!analysis) {
      console.error(
        `[AI Analysis] Analysis record not found: ${args.analysisId}`,
      );
      return null;
    }

    // Update status to processing
    await ctx.runMutation(internal.aiAnalysis.updateAnalysisStatus, {
      analysisId: args.analysisId,
      status: "processing",
    });

    try {
      // Get image URLs from storage
      const imageUrls: string[] = [];
      for (const storageId of analysis.imageStorageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) {
          imageUrls.push(url);
        }
      }

      if (imageUrls.length === 0) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "No valid image URLs found",
        });
      }

      // Get salon's active services for matching (only if organizationId is available)
      const services = analysis.organizationId
        ? await ctx.runQuery(internal.aiAnalysis.getActiveServicesInternal, {
            organizationId: analysis.organizationId,
          })
        : [];

      // Build ID→name catalog map for the AI to reference directly
      const serviceCatalogMap = Object.fromEntries(
        services.map((s) => [s._id, s.name]),
      );
      const hasCatalog = services.length > 0;

      // Build the prompt
      const focusAreas =
        ANALYSIS_FOCUS_BY_TYPE[analysis.salonType] ??
        ANALYSIS_FOCUS_BY_TYPE.multi;

      const isMultiImage = imageUrls.length > 1;
      const multiImageInstruction = isMultiImage
        ? "\n\nMultiple images from different angles are provided. Analyze ALL provided angles for a comprehensive assessment. Note consistency and differences across views."
        : "";

      const catalogSection = hasCatalog
        ? `\nService catalog (use exact IDs in recommendedServices.serviceId):\n${JSON.stringify(serviceCatalogMap, null, 2)}`
        : "\nNo service catalog — omit recommendedServices or leave it empty.";

      const prompt = `Analyze this customer's photo for a ${analysis.salonType} salon.

Focus on these aspects: ${focusAreas.join(", ")}.${multiImageInstruction}
${catalogSection}

Provide practical care tips and general product suggestions.
Be professional, encouraging, and specific — avoid generic advice.`;

      // Build image content parts for the AI message
      const imageContent = imageUrls.map((url) => ({
        type: "image" as const,
        image: new URL(url),
      }));

      // Create a persistent thread for this analysis so conversation history is stored
      const { threadId } = await photoAnalysisAgent.createThread(ctx, {
        userId: analysis.userId ?? undefined,
        title: `Photo Analysis – ${analysis.salonType}`,
      });
      await ctx.runMutation(internal.aiAnalysis.setAnalysisThreadId, {
        analysisId: args.analysisId,
        agentThreadId: threadId,
      });

      // Call GPT-4o vision via the agent (with retry on transient failures)
      const result = await withRetry(() =>
        photoAnalysisAgent.generateObject(
          ctx,
          { threadId, userId: analysis.userId ?? undefined },
          {
            prompt,
            messages: [
              {
                role: "user" as const,
                content: [...imageContent],
              },
            ],
            schema: analysisResultSchema,
          },
        ),
      );

      // AI returns serviceId values directly from the catalog map.
      // Validate each ID exists in the fetched services set to guard against hallucinations.
      const validServiceIdSet = new Set(services.map((s) => s._id));
      const matchedServiceIds: Id<"services">[] =
        result.object.recommendedServices
          .map((rec) => rec.serviceId as Id<"services">)
          .filter((id) => validServiceIdSet.has(id));

      // Update analysis with results
      await ctx.runMutation(internal.aiAnalysis.completeAnalysis, {
        analysisId: args.analysisId,
        result: result.object,
        recommendedServiceIds: matchedServiceIds,
      });
    } catch (error) {
      console.error(`[AI Analysis] Failed for ${args.analysisId}:`, error);

      const errorMessage = extractErrorMessage(error);

      // Update status to failed
      await ctx.runMutation(internal.aiAnalysis.failAnalysis, {
        analysisId: args.analysisId,
        errorMessage,
      });

      // Refund credits if userId is available
      if (analysis.userId) {
        await ctx.runMutation(internal.aiCredits.refundCredits, {
          ...(analysis.organizationId
            ? { organizationId: analysis.organizationId }
            : {}),
          userId: analysis.userId,
          amount: analysis.creditCost,
          featureType: "photoAnalysis",
          referenceId: args.analysisId,
          description: "Refund for failed photo analysis",
        });
      }
    }

    return null;
  },
});

// =============================================================================
// Quick Question Action
// =============================================================================

/**
 * Generate a quick answer to a follow-up question about an analysis.
 * Uses quickQuestionAgent.generateText() with stored analysis result as context.
 * Answer is saved ephemerally to the analysis record's quickAnswers field.
 */
export const runQuickQuestion = internalAction({
  args: {
    analysisId: v.id("aiAnalyses"),
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()),
    questionKey: v.string(),
    questionText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch the analysis record
    const analysis = await ctx.runQuery(
      internal.aiAnalysis.getAnalysisInternal,
      { analysisId: args.analysisId },
    );

    if (!analysis || !analysis.result) {
      console.error(
        `[Quick Question] Analysis not found or no result: ${args.analysisId}`,
      );
      return null;
    }

    try {
      const analysisResult = JSON.stringify(analysis.result);

      const prompt = `Based on this completed ${analysis.salonType} salon analysis:

${analysisResult}

Answer this specific question: "${args.questionText}"

Keep your answer to 2-4 sentences. Be specific to the customer's actual features from the analysis. Suggest specific styles, products, or techniques. Do NOT ask follow-up questions.`;

      // Reuse the analysis thread so follow-up questions share conversation history
      // If no thread exists yet (legacy records), create one on the fly
      let threadId = analysis.agentThreadId;
      if (!threadId) {
        const created = await quickQuestionAgent.createThread(ctx, {
          userId: args.userId ?? undefined,
          title: `Photo Analysis – follow-up`,
        });
        threadId = created.threadId;
        await ctx.runMutation(internal.aiAnalysis.setAnalysisThreadId, {
          analysisId: args.analysisId,
          agentThreadId: threadId,
        });
      }

      const result = await withRetry(() =>
        quickQuestionAgent.generateText(
          ctx,
          { threadId, userId: args.userId ?? undefined },
          { prompt } as Parameters<typeof quickQuestionAgent.generateText>[2],
        ),
      );

      // Save answer to the analysis record
      await ctx.runMutation(internal.aiAnalysis.saveQuickAnswer, {
        analysisId: args.analysisId,
        questionKey: args.questionKey,
        answer: result.text,
      });
    } catch (error) {
      console.error(`[Quick Question] Failed for ${args.analysisId}:`, error);

      // Save error state
      await ctx.runMutation(internal.aiAnalysis.saveQuickAnswer, {
        analysisId: args.analysisId,
        questionKey: args.questionKey,
        answer: "__error__",
      });

      // Refund credits if userId is available
      if (args.userId) {
        await ctx.runMutation(internal.aiCredits.refundCredits, {
          ...(args.organizationId
            ? { organizationId: args.organizationId }
            : {}),
          userId: args.userId,
          amount: CREDIT_COSTS.quickQuestion,
          featureType: "quickQuestion",
          referenceId: args.analysisId,
          description: "Refund for failed quick question",
        });
      }
    }

    return null;
  },
});
