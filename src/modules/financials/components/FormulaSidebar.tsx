"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Calculator,
  Calendar,
  FunctionSquare,
  GitBranch,
  Scissors,
  Search,
  Star,
  Type,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFavorites } from "../hooks/useFavorites";
import {
  CATEGORY_ORDER,
  FORMULA_CATALOG,
  type FormulaCategory,
  type FormulaEntry,
  getFormulasByCategory,
} from "../lib/formula-catalog";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { AllFormulasPanel } from "./sidebar/AllFormulasPanel";
import { CustomFormulasPanel } from "./sidebar/CustomFormulasPanel";
import { FavoritesPanel } from "./sidebar/FavoritesPanel";
import { IconStripButton } from "./sidebar/IconStripButton";
import { PreviewPanel } from "./sidebar/PreviewPanel";

type SidebarView = "all" | "favorites" | "custom";

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

interface CustomFormula {
  _id: Id<"customFormulas">;
  name: string;
  body: string;
  description?: string;
}

interface FormulaSidebarProps {
  onClose: () => void;
  customFormulasDocs?: CustomFormula[];
}

export function FormulaSidebar({
  onClose,
  customFormulasDocs = [],
}: FormulaSidebarProps) {
  const { setEditingValue, editingValue, selectionRange } = useSpreadsheet();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FormulaCategory | null>(
    null,
  );
  const [sidebarView, setSidebarView] = useState<SidebarView>("all");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<FormulaCategory>
  >(new Set(CATEGORY_ORDER));
  const [previewFormula, setPreviewFormula] = useState<FormulaEntry | null>(
    null,
  );
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const contentRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Map<FormulaCategory, HTMLDivElement>>(new Map());

  const byCategory = getFormulasByCategory();

  const toggleCategory = (cat: FormulaCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filterFormulas = (formulas: FormulaEntry[]): FormulaEntry[] => {
    if (!search.trim()) return formulas;
    const lower = search.toLowerCase();
    return formulas.filter(
      (f) =>
        f.name.toLowerCase().includes(lower) ||
        f.description.toLowerCase().includes(lower) ||
        f.params?.some((p) => p.name.toLowerCase().includes(lower)),
    );
  };

  const insertFormula = (name: string) => {
    if (selectionRange) {
      const formula = buildSelectionFormula(name as FormulaFn, selectionRange);
      if (formula) {
        copyFormulaToClipboard(formula);
        toast.success(`Copied ${formula}`);
        return;
      }
    }
    const template = `=${name}(`;
    if (editingValue.startsWith("=")) {
      setEditingValue(`${editingValue}${name}(`);
    } else {
      setEditingValue(template);
    }
  };

  const scrollToCategory = (cat: FormulaCategory) => {
    setActiveCategory(cat);
    setSidebarView("all");
    if (!expandedCategories.has(cat)) {
      setExpandedCategories((prev) => new Set([...prev, cat]));
    }
    requestAnimationFrame(() => {
      const el = categoryRefs.current.get(cat);
      if (el && contentRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  // Scroll-spy: detect visible category
  useEffect(() => {
    const container = contentRef.current;
    if (!container || sidebarView !== "all") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = entry.target.getAttribute(
              "data-category",
            ) as FormulaCategory;
            if (cat) setActiveCategory(cat);
          }
        }
      },
      { root: container, threshold: 0.3 },
    );

    for (const [, el] of categoryRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sidebarView]);

  const totalMatches = search.trim()
    ? CATEGORY_ORDER.reduce(
        (sum, cat) => sum + filterFormulas(byCategory[cat]).length,
        0,
      )
    : -1;

  const favoriteFormulas = FORMULA_CATALOG.filter((f) => favorites.has(f.name));

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col shrink-0 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <FunctionSquare className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium">Formulas</span>
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            {FORMULA_CATALOG.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={onClose}
          aria-label="Close formula sidebar"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            name="formula-search"
            aria-label="Search formulas"
            placeholder="Search formulas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>
        {totalMatches >= 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {totalMatches} {totalMatches === 1 ? "result" : "results"}
          </p>
        )}
      </div>

      {/* Main body: icon strip + content */}
      <div className="flex flex-1 min-h-0">
        {/* Vertical Icon Strip */}
        <div className="w-10 shrink-0 border-r border-border bg-muted/30 flex flex-col items-center py-1 gap-0.5 overflow-y-auto">
          <IconStripButton
            icon={Star}
            label="Favorites"
            isActive={sidebarView === "favorites"}
            onClick={() =>
              setSidebarView(sidebarView === "favorites" ? "all" : "favorites")
            }
          />
          {CATEGORY_ORDER.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat];
            const count = filterFormulas(byCategory[cat]).length;
            return (
              <IconStripButton
                key={cat}
                icon={Icon}
                label={cat}
                isActive={sidebarView === "all" && activeCategory === cat}
                onClick={() => scrollToCategory(cat)}
                badge={search.trim() && count > 0 ? count : undefined}
              />
            );
          })}
          <IconStripButton
            icon={User}
            label="My Formulas"
            isActive={sidebarView === "custom"}
            onClick={() =>
              setSidebarView(sidebarView === "custom" ? "all" : "custom")
            }
            badge={
              customFormulasDocs.length > 0
                ? customFormulasDocs.length
                : undefined
            }
          />
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto">
            {sidebarView === "all" && (
              <AllFormulasPanel
                byCategory={byCategory}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                filterFormulas={filterFormulas}
                insertFormula={insertFormula}
                setPreviewFormula={setPreviewFormula}
                previewFormula={previewFormula}
                categoryRefs={categoryRefs}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            )}
            {sidebarView === "favorites" && (
              <FavoritesPanel
                formulas={favoriteFormulas}
                insertFormula={insertFormula}
                setPreviewFormula={setPreviewFormula}
                previewFormula={previewFormula}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            )}
            {sidebarView === "custom" && (
              <CustomFormulasPanel customFormulas={customFormulasDocs} />
            )}
          </div>

          {/* Preview Panel (sticky bottom) */}
          {previewFormula && sidebarView !== "custom" && (
            <PreviewPanel
              formula={previewFormula}
              onInsert={() => insertFormula(previewFormula.name)}
              onClose={() => setPreviewFormula(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
