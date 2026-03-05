"use client";

import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// =============================================================================
// Processing Skeleton
// =============================================================================

export function ProcessingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-medium text-sm">Processing your try-on…</p>
          <p className="text-muted-foreground text-xs">
            Usually takes 15–30 seconds
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="mx-auto h-3 w-12" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="mx-auto h-3 w-12" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Completed Result
// =============================================================================

interface TryOnCompletedResultProps {
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  savedToMoodBoard: boolean;
  hasResultImage: boolean;
  onSaveToMoodBoard: () => void;
  onNavigateToMoodBoard?: () => void;
  onStartNew: () => void;
}

export function TryOnCompletedResult({
  beforeImageUrl,
  afterImageUrl,
  savedToMoodBoard,
  hasResultImage,
  onSaveToMoodBoard,
  onNavigateToMoodBoard,
  onStartNew,
}: TryOnCompletedResultProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Try-On Result</h3>
        <div className="flex items-center gap-2">
          {savedToMoodBoard ? (
            <>
              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                <Check className="h-3.5 w-3.5 text-primary" />
                Saved
              </span>
              {onNavigateToMoodBoard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateToMoodBoard}
                >
                  View Mood Board
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveToMoodBoard}
              disabled={!hasResultImage}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onStartNew}>
            New Try-On
          </Button>
        </div>
      </div>

      {/* Side-by-side images */}
      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="space-y-1.5">
          <p className="text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Before
          </p>
          <div className="h-[280px] overflow-hidden rounded-md border bg-muted/50">
            {beforeImageUrl ? (
              // biome-ignore lint/performance/noImgElement: dynamic storage URL
              <img
                src={beforeImageUrl}
                alt="Original appearance"
                className="h-full w-full object-contain"
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </div>

        {/* After */}
        <div className="space-y-1.5">
          <p className="text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
            After
          </p>
          <div className="h-[280px] overflow-hidden rounded-md border bg-muted/50">
            {afterImageUrl ? (
              // biome-ignore lint/performance/noImgElement: dynamic storage URL
              <img
                src={afterImageUrl}
                alt="Try-on result"
                className="h-full w-full object-contain"
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Failed State
// =============================================================================

interface TryOnFailedResultProps {
  errorMessage?: string | null;
  onStartNew: () => void;
}

export function TryOnFailedResult({
  errorMessage,
  onStartNew,
}: TryOnFailedResultProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground text-sm">
          {errorMessage ?? "Try-on failed. Please try again."}
        </p>
        <Button variant="outline" size="sm" onClick={onStartNew}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
