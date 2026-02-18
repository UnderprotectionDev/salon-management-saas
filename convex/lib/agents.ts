/**
 * AI Agent Definitions
 *
 * Specialized agents for photo analysis, quick questions, and care schedule generation.
 * All agents use the Vercel AI Gateway to route OpenAI calls.
 */

import type { UsageHandler } from "@convex-dev/agent";
import { Agent } from "@convex-dev/agent";
import { gateway } from "ai";
import { components } from "../_generated/api";

// =========================================================================
// Usage Handler — logs token usage and integrates with credit transactions
// =========================================================================

const usageHandler: UsageHandler = async (_ctx, args) => {
  const { userId, agentName, model, provider, usage, threadId } = args;
  // Log usage for debugging and billing reconciliation
  console.log(
    `[AI Usage] agent=${agentName} model=${model} provider=${provider} ` +
      `inputTokens=${usage.inputTokens ?? 0} outputTokens=${usage.outputTokens ?? 0} ` +
      `userId=${userId ?? "anonymous"} threadId=${threadId}`,
  );
};

// =========================================================================
// Photo Analysis Agent
// =========================================================================

export const photoAnalysisAgent = new Agent(components.agent, {
  name: "Photo Analysis Agent",
  languageModel: gateway("openai/gpt-4o"),
  instructions: `You are a professional salon analyst specializing in personal appearance assessment.
You analyze photos to provide detailed, actionable insights about a person's features.

Your analysis MUST be:
- Professional and encouraging in tone
- Specific and detailed (not generic)
- Actionable with clear recommendations
- Focused only on the salon-type-specific features listed in the user prompt

Always provide:
1. Feature analysis (type-specific, based on the focus areas in the prompt)
2. Recommended services from the salon's catalog
3. Care tips for home maintenance
4. Product recommendations (general suggestions)

When multiple images are provided, analyze all angles for a comprehensive assessment.`,
  usageHandler,
});

// =========================================================================
// Quick Question Agent
// =========================================================================

export const quickQuestionAgent = new Agent(components.agent, {
  name: "Quick Question Agent",
  languageModel: gateway("openai/gpt-4o"),
  instructions: `You are a concise salon advisor. You answer single follow-up questions
based on a previously completed photo analysis.

Rules:
- Keep answers to 2-4 sentences maximum
- Be specific to the customer's analysis results
- Reference their actual features (face shape, hair type, etc.)
- Suggest specific styles, products, or techniques
- Do NOT ask follow-up questions — this is single-turn Q&A`,
  usageHandler,
});

// =========================================================================
// Care Schedule Agent
// =========================================================================

export const careScheduleAgent = new Agent(components.agent, {
  name: "Care Schedule Agent",
  languageModel: gateway("openai/gpt-4o"),
  instructions: `You are a personal care scheduling expert. Based on a customer's visit history,
photo analysis results, and the salon's service catalog, you generate a personalized
maintenance calendar.

Guidelines by salon type:
- Hair: suggest cut intervals (6-8 weeks), root touch-up dates, treatment schedules
- Nail: gel fill (2-3 weeks), full set replacement (6-8 weeks), cuticle care
- Makeup: seasonal color refresh, skincare routine adjustments
- Barber: trim intervals (3-4 weeks), beard maintenance
- Spa: facial treatment frequency, seasonal adjustments

For each recommendation, provide:
1. A clear title
2. A brief description of why it's needed
3. A recommended date (YYYY-MM-DD format)
4. Match to a specific service from the catalog when possible`,
  usageHandler,
});
