import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { SimulationRecord } from "../tryOnTypes";

export function SelectionCard({
  simulation,
  checked,
  disabled,
  onToggle,
}: {
  simulation: SimulationRecord;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: Id<"aiSimulations">) => void;
}) {
  const date = new Date(simulation.createdAt);

  return (
    <button
      type="button"
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      } ${disabled && !checked ? "cursor-not-allowed opacity-50" : ""}`}
      onClick={() => {
        if (!disabled || checked) {
          onToggle(simulation._id);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          disabled={disabled && !checked}
          className="mt-0.5"
          aria-hidden
          tabIndex={-1}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-sm">
              {simulation.simulationType === "catalog"
                ? "Catalog Try-On"
                : "Prompt Try-On"}
            </span>
            <Badge variant="default" className="shrink-0">
              {simulation.status}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            {date.toLocaleDateString()}
            {simulation.promptText && ` \u00b7 "${simulation.promptText}"`}
          </p>
        </div>
      </div>
    </button>
  );
}
