"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  CREDIT_COSTS,
  QUICK_QUESTIONS_BY_TYPE,
} from "../../../../../convex/lib/aiConstants";

// =============================================================================
// Types
// =============================================================================

type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";

interface QuickQuestionsPanelProps {
  analysisId: Id<"aiAnalyses">;
  salonType: SalonType;
  /** Optional: passed through to enable service-context answers */
  organizationId?: Id<"organization">;
  creditBalance: number;
}

// =============================================================================
// Main Component
// =============================================================================

export function QuickQuestionsPanel({
  analysisId,
  salonType,
  organizationId,
  creditBalance,
}: QuickQuestionsPanelProps) {
  // Reactive query to get the analysis (includes quickAnswers)
  const analysis = useQuery(api.aiAnalysis.getAnalysis, { analysisId });
  const askQuestion = useMutation(api.aiAnalysis.askQuickQuestion);

  // Track locally submitted keys to prevent double-submit before server state updates
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const questions = QUICK_QUESTIONS_BY_TYPE[salonType] ?? [];
  const quickAnswers =
    (analysis?.quickAnswers as Record<string, string> | undefined) ?? {};
  const hasInsufficientCredits = creditBalance < CREDIT_COSTS.quickQuestion;

  async function handleAsk(questionKey: string, questionText: string) {
    setPendingKeys((prev) => new Set(prev).add(questionKey));
    try {
      await askQuestion({
        analysisId,
        organizationId,
        questionKey,
        questionText,
      });
    } catch (error) {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(questionKey);
        return next;
      });
      if (error instanceof ConvexError) {
        const message =
          (error.data as { message?: string })?.message ?? "Question failed";
        toast.error(message);
      } else {
        toast.error("Failed to ask question");
      }
    } finally {
      // Remove from pending once mutation settles (server state will take over)
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(questionKey);
        return next;
      });
    }
  }

  if (questions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircleQuestion className="h-4 w-4" />
          Quick Questions
          <span className="font-normal text-muted-foreground text-xs">
            ({CREDIT_COSTS.quickQuestion} credits each)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.map((q) => {
          const answer = quickAnswers[q.key];
          const isLoading = answer === "__loading__";
          const isError = answer === "__error__";
          const isAnswered = answer !== undefined && !isLoading && !isError;
          const isPending = pendingKeys.has(q.key);
          const isDisabled = isAnswered || isLoading || isPending || hasInsufficientCredits;

          return (
            <div key={q.key} className="space-y-1.5">
              <Button
                variant={isAnswered ? "secondary" : "outline"}
                size="sm"
                className="w-full justify-start text-left"
                disabled={isDisabled}
                onClick={() => handleAsk(q.key, q.label)}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : null}
                {q.label}
              </Button>

              {isAnswered && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  {answer}
                </div>
              )}

              {isError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
                  Failed to get answer. Credits have been refunded.
                </div>
              )}
            </div>
          );
        })}

        {hasInsufficientCredits && (
          <p className="text-muted-foreground text-xs">
            Insufficient credits to ask questions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
