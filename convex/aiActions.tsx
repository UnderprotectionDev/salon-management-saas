"use node";

/**
 * AI Actions — Node.js runtime actions for AI-powered features.
 *
 * LLM calls (photo analysis, care schedule, quick questions) go through
 * @convex-dev/agent which wraps the Vercel AI SDK + Vercel AI Gateway.
 *
 * Image generation / virtual try-on goes through fal.ai via @ai-sdk/fal.
 */

import { fal } from "@ai-sdk/fal";
import { generateImage } from "ai";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  careScheduleAgent,
  photoAnalysisAgent,
  quickQuestionAgent,
} from "./lib/agents";
import { ANALYSIS_FOCUS_BY_TYPE, CREDIT_COSTS } from "./lib/aiConstants";

// =============================================================================
// Retry Utility
// =============================================================================

/**
 * Execute an async function with exponential backoff + jitter.
 * Retries on any error, re-throws on final failure.
 *
 * @param fn       Async function to execute
 * @param maxRetries  Max attempts (default 3)
 * @param baseDelayMs Base delay in ms (default 1000, doubles each attempt)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // ConvexError (e.g. FORBIDDEN, VALIDATION_ERROR) are permanent — don't retry
      if (error instanceof ConvexError) throw error;
      lastError = error;
      if (attempt < maxRetries - 1) {
        // Exponential backoff + jitter
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

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
        throw new Error("No valid image URLs found");
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

      // Call GPT-4o vision via the agent (with retry on transient failures)
      const result = await withRetry(() =>
        photoAnalysisAgent.generateObject(
          ctx,
          { userId: analysis.userId ?? undefined },
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

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Update status to failed
      await ctx.runMutation(internal.aiAnalysis.failAnalysis, {
        analysisId: args.analysisId,
        errorMessage,
      });

      // Refund credits (organizationId is optional)
      await ctx.runMutation(internal.aiCredits.refundCredits, {
        ...(analysis.organizationId
          ? { organizationId: analysis.organizationId }
          : {}),
        userId: analysis.userId ?? undefined,
        poolType: "customer",
        amount: analysis.creditCost,
        featureType: "photoAnalysis",
        referenceId: args.analysisId,
        description: "Refund for failed photo analysis",
      });
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

      const result = await withRetry(() =>
        quickQuestionAgent.generateText(
          ctx,
          { userId: args.userId ?? undefined },
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

      // Refund credits (organizationId is optional)
      await ctx.runMutation(internal.aiCredits.refundCredits, {
        ...(args.organizationId ? { organizationId: args.organizationId } : {}),
        userId: args.userId,
        poolType: "customer",
        amount: CREDIT_COSTS.quickQuestion,
        featureType: "quickQuestion",
        referenceId: args.analysisId,
        description: "Refund for failed quick question",
      });
    }

    return null;
  },
});

// =============================================================================
// Virtual Try-On Action (fal.ai via @ai-sdk/fal)
// =============================================================================

/**
 * Run virtual try-on using fal.ai image-to-image via the AI SDK.
 *
 * - LLM calls (analysis, care schedule) → Vercel AI Gateway
 * - Image generation (try-on) → fal.ai via @ai-sdk/fal + generateImage
 *
 * Model selection by salon type:
 * - hair / nail / makeup / multi → fal-ai/flux/dev/image-to-image (style transfer)
 *
 * Flow:
 * 1. Get source photo URL + design reference (catalog image or prompt)
 * 2. Call fal.ai image-to-image via generateImage()
 * 3. Store result Uint8Array in Convex file storage
 * 4. Update simulation record with result
 *
 * On failure: refunds credits automatically.
 */
export const runVirtualTryOn = internalAction({
  args: {
    simulationId: v.id("aiSimulations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch the simulation record
    const simulation = await ctx.runQuery(
      internal.aiSimulations.getSimulationInternal,
      { simulationId: args.simulationId },
    );

    if (!simulation) {
      console.error(
        `[Virtual Try-On] Simulation not found: ${args.simulationId}`,
      );
      return null;
    }

    // Update status to processing
    await ctx.runMutation(internal.aiSimulations.updateSimulationStatus, {
      simulationId: args.simulationId,
      status: "processing",
    });

    try {
      // Get source photo URL
      const sourceUrl = await ctx.storage.getUrl(simulation.imageStorageId);
      if (!sourceUrl) {
        throw new Error("Source image URL not found");
      }

      // Get the organization to determine salonType (if org is available)
      const org = simulation.organizationId
        ? await ctx.runQuery(internal.aiSimulations.getOrgInternal, {
            organizationId: simulation.organizationId,
          })
        : null;
      const salonType = org?.salonType ?? "multi";

      // Build prompt and image URL list for OmniGen-v2 virtual try-on.
      //
      // OmniGen-v2 is specifically designed for virtual try-on. It accepts
      // multiple reference images via `input_image_urls` and references them
      // in the prompt via <img><|image_N|></img> tokens.
      //
      // image_1 = source photo (person to transform)
      // image_2 = catalog design reference (optional, catalog mode only)
      let tryOnPrompt: string;
      const inputImageUrls: string[] = [sourceUrl]; // <|image_1|>

      if (
        simulation.simulationType === "catalog" &&
        simulation.designCatalogId
      ) {
        // Get design catalog image
        const design = await ctx.runQuery(
          internal.aiSimulations.getDesignInternal,
          { designId: simulation.designCatalogId },
        );
        if (!design) {
          throw new Error("Design catalog entry not found");
        }
        const refUrl = await ctx.storage.getUrl(design.imageStorageId);
        if (refUrl) {
          inputImageUrls.push(refUrl); // <|image_2|>
          if (salonType === "nail") {
            tryOnPrompt =
              "The first image <img><|image_1|></img> shows a hand with nails. " +
              "The second image <img><|image_2|></img> shows a nail art design. " +
              "Apply the exact nail design from the second image to every nail in the first image. " +
              "Match the colors, patterns, shapes, and decorations as closely as possible. " +
              "Keep the hand, fingers, skin tone, and background exactly the same. " +
              "Only change the nail color and nail art design.";
          } else if (salonType === "hair") {
            tryOnPrompt =
              "The first image <img><|image_1|></img> shows a person. " +
              "The second image <img><|image_2|></img> shows a hairstyle reference. " +
              "Apply the exact hairstyle and hair color from the second image to the person in the first image. " +
              "Keep the person's face, body, clothing, and background exactly the same. " +
              "Only change the hair length, cut, style, and color.";
          } else if (salonType === "makeup") {
            tryOnPrompt =
              "The first image <img><|image_1|></img> shows a person's face. " +
              "The second image <img><|image_2|></img> shows a makeup look reference. " +
              "Apply the exact makeup from the second image to the face in the first image. " +
              "Match the eye makeup, lip color, blush, and contouring as closely as possible. " +
              "Keep the person's facial features, skin tone, and background exactly the same. " +
              "Only change the makeup.";
          } else {
            tryOnPrompt =
              "The first image <img><|image_1|></img> shows a person. " +
              "The second image <img><|image_2|></img> shows a style reference. " +
              "Apply the style, look, and design from the second image to the person in the first image. " +
              "Keep the person's facial features and body structure exactly the same.";
          }
        } else {
          tryOnPrompt = `The image <img><|image_1|></img> shows a person. Apply a stylish ${salonType} look. Keep everything else the same.`;
        }
      } else {
        // Prompt mode — user-provided description
        const userPrompt =
          simulation.promptText ?? `Apply a stylish ${salonType} look`;
        if (salonType === "nail") {
          tryOnPrompt =
            `The image <img><|image_1|></img> shows a hand with nails. ${userPrompt}. ` +
            "Keep the hand, fingers, skin tone, and background exactly the same. Only change the nail color and design.";
        } else if (salonType === "hair") {
          tryOnPrompt =
            `The image <img><|image_1|></img> shows a person. ${userPrompt}. ` +
            "Keep the person's face, body, and background exactly the same. Only change the hair.";
        } else if (salonType === "makeup") {
          tryOnPrompt =
            `The image <img><|image_1|></img> shows a person's face. ${userPrompt}. ` +
            "Keep the facial features and background exactly the same. Only change the makeup.";
        } else {
          tryOnPrompt =
            `The image <img><|image_1|></img> shows a person. ${userPrompt}. ` +
            "Keep the person's facial features and body structure exactly the same.";
        }
      }

      console.log("[VirtualTryOn] salonType:", salonType);
      console.log("[VirtualTryOn] simulationType:", simulation.simulationType);
      console.log("[VirtualTryOn] prompt:", tryOnPrompt);
      console.log("[VirtualTryOn] inputImageUrls:", inputImageUrls);

      // Call fal-ai/omnigen-v2 — designed for virtual try-on with reference images.
      // inputImageUrls maps to input_image_urls in the fal.ai request (camelCase → snake_case).
      // Use retry for transient network/model failures (max 2 retries, longer base delay for image gen)
      const { image } = await withRetry(
        () =>
          generateImage({
            model: fal.image("fal-ai/omnigen-v2"),
            prompt: tryOnPrompt,
            providerOptions: {
              fal: {
                inputImageUrls,
                guidanceScale: 2.5,
                imgGuidanceScale: 1.6,
                numInferenceSteps: 50,
              },
            },
          }),
        2, // max 2 retries (image gen is expensive)
        2000, // longer base delay
      );

      // Store result in Convex file storage
      // Slice ensures we get a plain ArrayBuffer (not SharedArrayBuffer) for Blob
      const resultBlob = new Blob(
        [image.uint8Array.buffer.slice(0) as ArrayBuffer],
        { type: "image/png" },
      );
      const resultStorageId = await ctx.storage.store(resultBlob);

      // Complete simulation
      await ctx.runMutation(internal.aiSimulations.completeSimulation, {
        simulationId: args.simulationId,
        resultImageStorageId: resultStorageId,
      });
    } catch (error) {
      console.error(`[Virtual Try-On] Failed for ${args.simulationId}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Fail simulation
      await ctx.runMutation(internal.aiSimulations.failSimulation, {
        simulationId: args.simulationId,
        errorMessage,
      });

      // Refund credits (organizationId is optional)
      await ctx.runMutation(internal.aiCredits.refundCredits, {
        ...(simulation.organizationId
          ? { organizationId: simulation.organizationId }
          : {}),
        userId: simulation.userId ?? undefined,
        poolType: "customer",
        amount: simulation.creditCost,
        featureType: "virtualTryOn",
        referenceId: args.simulationId,
        description: "Refund for failed virtual try-on",
      });
    }

    return null;
  },
});

// =============================================================================
// Care Schedule Zod Schema
// =============================================================================

const careRecommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().describe("Short title (e.g., 'Trim & Shape')"),
        description: z
          .string()
          .describe("Why this service/care step is recommended"),
        recommendedDate: z
          .string()
          .describe("Recommended date in YYYY-MM-DD format"),
        serviceId: z
          .string()
          .optional()
          .describe(
            "The exact service ID from the catalog map provided in the prompt, if applicable",
          ),
      }),
    )
    .describe("Personalized care recommendations"),
  nextCheckDate: z
    .string()
    .describe(
      "Date to re-evaluate the schedule (YYYY-MM-DD), typically 4-8 weeks out",
    ),
});

// =============================================================================
// Care Schedule Generation Action
// =============================================================================

/**
 * Generate personalized care schedule using the careScheduleAgent.
 *
 * Gathers: customer appointments, photo analysis result (if any), active services.
 * Calls GPT-4o via careScheduleAgent.generateObject() to produce recommendations.
 */
export const runCareScheduleGeneration = internalAction({
  args: {
    scheduleId: v.id("aiCareSchedules"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch the schedule record
    const schedule = await ctx.runQuery(
      internal.aiCareSchedules.getScheduleInternal,
      { scheduleId: args.scheduleId },
    );

    if (!schedule) {
      console.error(`[Care Schedule] Schedule not found: ${args.scheduleId}`);
      return null;
    }

    try {
      const scheduleUserId = schedule.userId ?? "";

      // Gather context: appointments (all orgs), latest analysis, services (optional)
      const appointments = await ctx.runQuery(
        internal.aiCareSchedules.getUserAppointments,
        { userId: scheduleUserId, limit: 20 },
      );
      const latestAnalysis = await ctx.runQuery(
        internal.aiCareSchedules.getLatestUserAnalysis,
        { userId: scheduleUserId },
      );
      // If an org is associated, fetch its active services for matching
      const services = schedule.organizationId
        ? await ctx.runQuery(internal.aiCareSchedules.getActiveServices, {
            organizationId: schedule.organizationId,
          })
        : [];

      // Use salonType from the schedule record (set at generation time)
      const salonType = schedule.salonType ?? "multi";

      // Build prompt
      const today = new Date().toISOString().slice(0, 10);

      // Build ID→name catalog map for AI to return IDs directly
      const serviceCatalogMap = Object.fromEntries(
        services.map((s: { _id: string; name: string; duration: number }) => [
          s._id,
          s.name,
        ]),
      );
      const hasCatalog = services.length > 0;

      const appointmentSummary =
        appointments.length > 0
          ? appointments
              .slice(0, 10)
              .map(
                (a: { date: string; services: string[]; status: string }) =>
                  `${a.date}: ${a.services.join(", ")} (${a.status})`,
              )
              .join("\n")
          : "No previous appointments";

      const analysisSummary = latestAnalysis?.result
        ? `Photo analysis result: ${JSON.stringify(latestAnalysis.result)}`
        : "No photo analysis available";

      const catalogSection = hasCatalog
        ? `\nService catalog (use exact IDs in recommendations.serviceId):\n${JSON.stringify(serviceCatalogMap, null, 2)}`
        : "\nNo service catalog — omit serviceId in recommendations.";

      const prompt = `Generate a personalized care schedule for a ${salonType} salon customer.

Today's date: ${today}

Customer visit history (most recent first):
${appointmentSummary}

${analysisSummary}
${catalogSection}

Based on the customer's visit frequency, service history, and analysis data:
1. Recommend specific maintenance appointments with target dates
2. Match recommendations to the salon's actual services using serviceId from the catalog above
3. Include home care steps between visits
4. Set a nextCheckDate for when this schedule should be re-evaluated

Be specific with dates (YYYY-MM-DD format). Space recommendations appropriately based on the service type and customer's historical visit frequency.`;

      const result = await withRetry(() =>
        careScheduleAgent.generateObject(
          ctx,
          { userId: schedule.userId ?? undefined },
          {
            prompt,
            schema: careRecommendationSchema,
          },
        ),
      );

      // AI returns serviceId values directly from the catalog map.
      // Validate each ID exists in the fetched services set to guard against hallucinations.
      const validServiceIdSet = new Set(
        services.map(
          (s: { _id: string; name: string; duration: number }) => s._id,
        ),
      );
      const recommendations = result.object.recommendations.map((rec) => {
        const validatedServiceId =
          rec.serviceId && validServiceIdSet.has(rec.serviceId)
            ? (rec.serviceId as Id<"services">)
            : undefined;

        return {
          title: rec.title,
          description: rec.description,
          recommendedDate: rec.recommendedDate,
          ...(validatedServiceId ? { serviceId: validatedServiceId } : {}),
        };
      });

      // Complete the schedule
      await ctx.runMutation(internal.aiCareSchedules.completeSchedule, {
        scheduleId: args.scheduleId,
        recommendations,
        nextCheckDate: result.object.nextCheckDate,
      });
    } catch (error) {
      console.error(`[Care Schedule] Failed for ${args.scheduleId}:`, error);

      // Mark schedule as expired
      await ctx.runMutation(internal.aiCareSchedules.failSchedule, {
        scheduleId: args.scheduleId,
      });

      // Refund credits (same pattern as photo analysis and virtual try-on)
      if (schedule.userId) {
        await ctx.runMutation(internal.aiCredits.refundCredits, {
          ...(schedule.organizationId
            ? { organizationId: schedule.organizationId }
            : {}),
          userId: schedule.userId,
          poolType: "customer",
          amount: schedule.creditCost,
          featureType: "careSchedule",
          referenceId: args.scheduleId,
          description: "Refund for failed care schedule generation",
        });
      }
    }

    return null;
  },
});
