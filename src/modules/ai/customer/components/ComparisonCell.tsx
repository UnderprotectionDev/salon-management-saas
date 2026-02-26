"use client";

import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { SimulationRecord } from "../tryOnTypes";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

export function ComparisonCell({
  simulation,
  urls,
  onFavorite,
}: {
  simulation: SimulationRecord;
  urls: { before: string | null; after: string | null };
  onFavorite: (id: Id<"aiSimulations">) => void;
}) {
  const date = new Date(simulation.createdAt);
  const label =
    simulation.simulationType === "catalog"
      ? "Catalog Try-On"
      : simulation.promptText
        ? `"${simulation.promptText}"`
        : "Prompt Try-On";

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3">
        {/* Slider or placeholder */}
        {urls.before && urls.after ? (
          <BeforeAfterSlider beforeUrl={urls.before} afterUrl={urls.after} />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-md border bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Info */}
        <div className="space-y-1">
          <p className="truncate font-medium text-sm" title={label}>
            {label}
          </p>
          <p className="text-muted-foreground text-xs">
            {date.toLocaleDateString()}
          </p>
        </div>

        {/* Set as Favorite (stub — saves to Mood Board) */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onFavorite(simulation._id)}
        >
          <Heart className="mr-2 h-3.5 w-3.5" />
          Set as Favorite
        </Button>
      </CardContent>
    </Card>
  );
}
