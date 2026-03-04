import { Star } from "lucide-react";
import type { FormulaEntry } from "../../lib/formula-catalog";
import { FormulaRow } from "./FormulaRow";

interface FavoritesPanelProps {
  formulas: FormulaEntry[];
  insertFormula: (name: string) => void;
  setPreviewFormula: (f: FormulaEntry | null) => void;
  previewFormula: FormulaEntry | null;
  favorites: Set<string>;
  toggleFavorite: (name: string) => void;
}

export function FavoritesPanel({
  formulas,
  insertFormula,
  setPreviewFormula,
  previewFormula,
  favorites,
  toggleFavorite,
}: FavoritesPanelProps) {
  if (formulas.length === 0) {
    return (
      <div className="p-4 text-center">
        <Star className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No favorites yet. Click the star on any formula to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {formulas.map((f) => (
        <FormulaRow
          key={f.name}
          formula={f}
          isSelected={previewFormula?.name === f.name}
          onSelect={() =>
            setPreviewFormula(previewFormula?.name === f.name ? null : f)
          }
          onInsert={() => insertFormula(f.name)}
          isFavorite={favorites.has(f.name)}
          onToggleFavorite={() => toggleFavorite(f.name)}
          showCategoryBadge
        />
      ))}
    </div>
  );
}
