import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export function AnalysisHistoryItem({
  analysis,
  onSelect,
  isSelected,
}: {
  analysis: Doc<"aiAnalyses">;
  onSelect: (id: Id<"aiAnalyses">) => void;
  isSelected: boolean;
}) {
  const date = new Date(analysis.createdAt);

  return (
    <button
      type="button"
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={() => onSelect(analysis._id)}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">
          {analysis.salonType.charAt(0).toUpperCase() +
            analysis.salonType.slice(1)}{" "}
          Analysis
        </div>
        <Badge
          variant={
            analysis.status === "completed"
              ? "default"
              : analysis.status === "failed"
                ? "destructive"
                : "secondary"
          }
        >
          {analysis.status}
        </Badge>
      </div>
      <div className="mt-1 text-muted-foreground text-xs">
        {date.toLocaleDateString()} &middot; {analysis.imageStorageIds.length}{" "}
        photo{analysis.imageStorageIds.length !== 1 ? "s" : ""} &middot;{" "}
        {analysis.creditCost} credits
      </div>
    </button>
  );
}
