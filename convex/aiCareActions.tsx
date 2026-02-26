"use node";

/**
 * AI Care Schedule Actions — Personalized care schedule generation.
 * Extracted from aiActions.tsx for single-responsibility.
 */

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { withRetry } from "./aiHelpers";
import { careScheduleAgent } from "./lib/agents";

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
      const scheduleUserId = schedule.userId;
      if (!scheduleUserId) {
        console.error(
          `[Care Schedule] No userId on schedule ${args.scheduleId}, cannot generate`,
        );
        return null;
      }

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

      // Create a persistent thread for this schedule generation
      const { threadId } = await careScheduleAgent.createThread(ctx, {
        userId: schedule.userId ?? undefined,
        title: `Care Schedule – ${salonType}`,
      });
      await ctx.runMutation(internal.aiCareSchedules.setScheduleThreadId, {
        scheduleId: args.scheduleId,
        agentThreadId: threadId,
      });

      const result = await withRetry(() =>
        careScheduleAgent.generateObject(
          ctx,
          { threadId, userId: schedule.userId ?? undefined },
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

      // Mark schedule as failed
      try {
        await ctx.runMutation(internal.aiCareSchedules.failSchedule, {
          scheduleId: args.scheduleId,
        });
      } catch (failErr) {
        console.error(
          `[Care Schedule] Failed to mark schedule as failed:`,
          failErr,
        );
      }

      // Refund credits if userId is available
      if (schedule.userId && schedule.creditCost > 0) {
        try {
          await ctx.runMutation(internal.aiCredits.refundCredits, {
            ...(schedule.organizationId
              ? { organizationId: schedule.organizationId }
              : {}),
            userId: schedule.userId,
            amount: schedule.creditCost,
            featureType: "careSchedule",
            referenceId: args.scheduleId,
            description: "Refund for failed care schedule generation",
          });
        } catch (refundErr) {
          console.error(
            `[Care Schedule] Failed to refund credits for ${args.scheduleId}:`,
            refundErr,
          );
        }
      }
    }

    return null;
  },
});
