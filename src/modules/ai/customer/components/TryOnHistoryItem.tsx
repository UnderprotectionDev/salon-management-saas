import { Badge } from "@/components/ui/badge";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function TryOnHistoryItem({
  simulation,
  isSelected,
  onSelect,
}: {
  simulation: {
    _id: Id<"aiSimulations">;
    simulationType: "catalog" | "prompt";
    status: string;
    createdAt: number;
    creditCost: number;
    promptText?: string;
  };
  isSelected: boolean;
  onSelect: (id: Id<"aiSimulations">) => void;
}) {
  const date = new Date(simulation.createdAt);

  return (
    <button
      type="button"
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={() => onSelect(simulation._id)}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">
          {simulation.simulationType === "catalog"
            ? "Catalog Try-On"
            : "Prompt Try-On"}
        </div>
        <Badge
          variant={
            simulation.status === "completed"
              ? "default"
              : simulation.status === "failed"
                ? "destructive"
                : "secondary"
          }
        >
          {simulation.status}
        </Badge>
      </div>
      <div className="mt-1 text-muted-foreground text-xs">
        {date.toLocaleDateString()} &middot; {simulation.creditCost} credits
        {simulation.promptText ? ` \u00b7 "${simulation.promptText}"` : ""}
      </div>
    </button>
  );
}
