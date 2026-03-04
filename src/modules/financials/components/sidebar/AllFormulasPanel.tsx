import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Scissors,
  Search,
  Type,
} from "lucide-react";
import {
  CATEGORY_ORDER,
  type FormulaCategory,
  type FormulaEntry,
} from "../../lib/formula-catalog";
import { FormulaRow } from "./FormulaRow";

const CATEGORY_ICON_MAP: Record<FormulaCategory, LucideIcon> = {
  Math: Calculator,
  Statistics: BarChart3,
  Text: Type,
  "Date/Time": Calendar,
  Logical: GitBranch,
  Lookup: Search,
  Financial: Banknote,
  Conversion: ArrowLeftRight,
  Salon: Scissors,
};

export { CATEGORY_ICON_MAP };

interface AllFormulasPanelProps {
  byCategory: Record<FormulaCategory, FormulaEntry[]>;
  expandedCategories: Set<FormulaCategory>;
  toggleCategory: (cat: FormulaCategory) => void;
  filterFormulas: (formulas: FormulaEntry[]) => FormulaEntry[];
  insertFormula: (name: string) => void;
  setPreviewFormula: (f: FormulaEntry | null) => void;
  previewFormula: FormulaEntry | null;
  categoryRefs: React.RefObject<Map<FormulaCategory, HTMLDivElement>>;
  favorites: Set<string>;
  toggleFavorite: (name: string) => void;
}

export function AllFormulasPanel({
  byCategory,
  expandedCategories,
  toggleCategory,
  filterFormulas,
  insertFormula,
  setPreviewFormula,
  previewFormula,
  categoryRefs,
  favorites,
  toggleFavorite,
}: AllFormulasPanelProps) {
  return (
    <>
      {CATEGORY_ORDER.map((cat) => {
        const formulas = filterFormulas(byCategory[cat]);
        if (formulas.length === 0) return null;
        const isExpanded = expandedCategories.has(cat);
        const Icon = CATEGORY_ICON_MAP[cat];

        return (
          <div
            key={cat}
            data-category={cat}
            ref={(el) => {
              if (el) {
                categoryRefs.current?.set(cat, el);
              } else {
                categoryRefs.current?.delete(cat);
              }
            }}
          >
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors sticky top-0 bg-background z-10"
            >
              {isExpanded ? (
                <ChevronDown className="size-3 shrink-0" />
              ) : (
                <ChevronRight className="size-3 shrink-0" />
              )}
              <Icon className="size-3 shrink-0" />
              {cat}
              <span className="ml-auto text-[10px] tabular-nums">
                {formulas.length}
              </span>
            </button>

            {isExpanded && (
              <div className="pb-1">
                {formulas.map((f) => (
                  <FormulaRow
                    key={f.name}
                    formula={f}
                    isSelected={previewFormula?.name === f.name}
                    onSelect={() =>
                      setPreviewFormula(
                        previewFormula?.name === f.name ? null : f,
                      )
                    }
                    onInsert={() => insertFormula(f.name)}
                    isFavorite={favorites.has(f.name)}
                    onToggleFavorite={() => toggleFavorite(f.name)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
