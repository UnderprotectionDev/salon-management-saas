"use node";

/**
 * AI Simulation Actions — Virtual try-on via fal.ai.
 * Extracted from aiActions.tsx for single-responsibility.
 */

import { fal } from "@ai-sdk/fal";
import { generateImage } from "ai";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { extractErrorMessage, withRetry } from "./aiHelpers";
import { ErrorCode } from "./lib/functions";

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
 * - hair / nail / makeup / multi → fal-ai/omnigen-v2 (virtual try-on)
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
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Source image URL not found",
        });
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
          throw new ConvexError({
            code: ErrorCode.NOT_FOUND,
            message: "Design catalog entry not found",
          });
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
          } else if (salonType === "hair_women" || salonType === "hair_men") {
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
        } else if (salonType === "hair_women" || salonType === "hair_men") {
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

      const errorMessage = extractErrorMessage(error);

      // Fail simulation
      await ctx.runMutation(internal.aiSimulations.failSimulation, {
        simulationId: args.simulationId,
        errorMessage,
      });

      // Refund credits if userId is available
      if (simulation.userId) {
        await ctx.runMutation(internal.aiCredits.refundCredits, {
          ...(simulation.organizationId
            ? { organizationId: simulation.organizationId }
            : {}),
          userId: simulation.userId,
          amount: simulation.creditCost,
          featureType: "virtualTryOn",
          referenceId: args.simulationId,
          description: "Refund for failed virtual try-on",
        });
      }
    }

    return null;
  },
});
