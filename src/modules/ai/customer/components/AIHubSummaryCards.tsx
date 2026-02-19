"use client";

import { useQuery } from "convex/react";
import { CalendarCheck, Camera, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";

// =============================================================================
// Types
// =============================================================================

type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";
type Section = "analysis" | "tryon" | "styles" | "schedule";

interface AIHubSummaryCardsProps {
  salonType: SalonType;
  onSelectSection: (section: Section) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-1 h-5 w-32" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AIHubSummaryCards({
  salonType,
  onSelectSection,
}: AIHubSummaryCardsProps) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const latestAnalysis = useQuery(
    api.aiAnalysis.listMyAnalyses,
    isAuthenticated ? { limit: 1 } : "skip",
  );
  const latestSimulation = useQuery(
    api.aiSimulations.listMySimulations,
    isAuthenticated ? { limit: 1 } : "skip",
  );
  const careSchedule = useQuery(
    api.aiCareSchedules.getMySchedule,
    isAuthenticated ? { salonType } : "skip",
  );

  if (!isAuthenticated) {
    return null;
  }

  const isLoading =
    latestAnalysis === undefined ||
    latestSimulation === undefined ||
    careSchedule === undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>
    );
  }

  const analysis = latestAnalysis?.[0] ?? null;
  const simulation = latestSimulation?.[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Last Analysis */}
      <button
        type="button"
        className="text-left"
        onClick={() => onSelectSection("analysis")}
      >
        <Card className="h-full border-t-2 border-t-violet-300 transition-colors hover:border-muted-foreground/30 hover:border-t-violet-300">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Camera className="size-3.5" />
                Last Analysis
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </div>
            {analysis ? (
              <>
                <p className="truncate font-medium text-sm">
                  {analysis.salonType.charAt(0).toUpperCase() +
                    analysis.salonType.slice(1)}{" "}
                  Analysis
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={
                      analysis.status === "completed"
                        ? "default"
                        : analysis.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {analysis.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeDate(analysis.createdAt)}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">No analyses yet</p>
                <p className="font-medium text-primary text-xs">
                  Start your first
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* Last Try-On */}
      <button
        type="button"
        className="text-left"
        onClick={() => onSelectSection("tryon")}
      >
        <Card className="h-full border-t-2 border-t-amber-300 transition-colors hover:border-muted-foreground/30 hover:border-t-amber-300">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Sparkles className="size-3.5" />
                Last Try-On
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </div>
            {simulation ? (
              <>
                <p className="truncate font-medium text-sm">
                  {simulation.simulationType === "catalog"
                    ? "Catalog Try-On"
                    : "Prompt Try-On"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={
                      simulation.status === "completed"
                        ? "default"
                        : simulation.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {simulation.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeDate(simulation.createdAt)}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">No try-ons yet</p>
                <p className="font-medium text-primary text-xs">
                  Try your first look
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </button>

      {/* Care Schedule */}
      <button
        type="button"
        className="text-left"
        onClick={() => onSelectSection("schedule")}
      >
        <Card className="h-full border-t-2 border-t-emerald-300 transition-colors hover:border-muted-foreground/30 hover:border-t-emerald-300">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <CalendarCheck className="size-3.5" />
                Care Schedule
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </div>
            {careSchedule ? (
              <>
                <p className="truncate font-medium text-sm">
                  {careSchedule.recommendations?.[0]?.title ??
                    "Active Schedule"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {careSchedule.nextCheckDate && (
                    <span className="text-muted-foreground text-xs">
                      Next:{" "}
                      {new Date(
                        careSchedule.nextCheckDate,
                      ).toLocaleDateString()}
                    </span>
                  )}
                  <Badge variant="default" className="text-xs">
                    {careSchedule.recommendations?.length ?? 0} tips
                  </Badge>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">No schedule yet</p>
                <p className="font-medium text-primary text-xs">Generate one</p>
              </div>
            )}
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
