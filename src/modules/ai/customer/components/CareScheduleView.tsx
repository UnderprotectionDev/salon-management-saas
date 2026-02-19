"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";

// =============================================================================
// Types
// =============================================================================

type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";

interface CareScheduleViewProps {
  salonType: SalonType;
}

// =============================================================================
// Component
// =============================================================================

export function CareScheduleView({ salonType }: CareScheduleViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const schedule = useQuery(
    api.aiCareSchedules.getMySchedule,
    isAuthenticated ? { salonType } : "skip",
  );

  const generateSchedule = useMutation(api.aiCareSchedules.generateSchedule);

  // Not authenticated → schedule query is skipped permanently, avoid infinite loading
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed py-12">
        <CalendarDays className="h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium text-lg">Sign In Required</h3>
        <p className="max-w-sm text-center text-muted-foreground text-sm">
          Sign in to view and generate your personalized care schedule.
        </p>
      </div>
    );
  }

  // Loading
  if (schedule === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg">My Care Schedule</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await generateSchedule({ salonType });
      toast.success("Care schedule generation started");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string }).message ?? "Error")
          : "Failed to generate care schedule",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // Empty state — no schedule yet
  if (!schedule || schedule.recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed py-12">
        <CalendarDays className="h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium text-lg">My Care Schedule</h3>
        <p className="max-w-sm text-center text-muted-foreground text-sm">
          Get a personalized care calendar based on your visit history and photo
          analysis. Costs 2 credits.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Care Schedule
        </Button>
      </div>
    );
  }

  // Format date for display
  function formatDate(dateStr: string) {
    try {
      const date = new Date(`${dateStr}T00:00:00`);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  // Check if a date is in the past (local timezone)
  function isPastDue(dateStr: string) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return dateStr < today;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">My Care Schedule</h3>
          {schedule.nextCheckDate && (
            <p className="text-muted-foreground text-sm">
              Next review: {formatDate(schedule.nextCheckDate)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Regenerate
        </Button>
      </div>

      <div className="space-y-3">
        {schedule.recommendations.map(
          (
            rec: {
              title: string;
              description: string;
              recommendedDate: string;
              serviceId?: string;
            },
            index: number,
          ) => {
            const pastDue = isPastDue(rec.recommendedDate);

            return (
              <Card
                // biome-ignore lint/suspicious/noArrayIndexKey: recommendations are ordered
                key={index}
                className={
                  pastDue
                    ? "border-l-4 border-l-orange-400 border-orange-300 bg-orange-50/50"
                    : "border-l-4 border-l-primary/20"
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{rec.title}</CardTitle>
                    <div
                      className={`flex items-center gap-1 text-xs ${
                        pastDue
                          ? "font-medium text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {pastDue ? (
                        <CalendarDays className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {formatDate(rec.recommendedDate)}
                      {pastDue && " (overdue)"}
                    </div>
                  </div>
                  {rec.serviceId && (
                    <CardDescription className="text-xs">
                      Matched service available
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {rec.description}
                  </p>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>
    </div>
  );
}
