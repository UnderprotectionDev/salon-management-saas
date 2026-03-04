import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormulaEntry } from "../../lib/formula-catalog";

interface FormulaRowProps {
  formula: FormulaEntry;
  isSelected: boolean;
  onSelect: () => void;
  onInsert: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  showCategoryBadge?: boolean;
}

export function FormulaRow({
  formula,
  isSelected,
  onSelect,
  onInsert,
  isFavorite,
  onToggleFavorite,
  showCategoryBadge,
}: FormulaRowProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: wrapper contains interactive Button children
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "mx-2 mb-0.5 px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer group",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-accent/30 border border-transparent",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          "shrink-0 transition-colors",
          isFavorite
            ? "text-yellow-500"
            : "text-transparent group-hover:text-muted-foreground/40",
        )}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={isFavorite}
      >
        <Star className={cn("size-3", isFavorite && "fill-yellow-500")} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <code className="text-[11px] font-bold text-primary truncate">
            {formula.name}
          </code>
          {showCategoryBadge && (
            <Badge
              variant="outline"
              className="text-[8px] px-1 py-0 h-3.5 shrink-0"
            >
              {formula.category}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {formula.description}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-5 px-1.5 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onInsert();
        }}
      >
        Insert
      </Button>
    </div>
  );
}
