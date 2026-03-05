"use client";

import { Check, Image as ImageIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { DesignBrowser, type SelectedDesign } from "./DesignBrowser";
import type { TryOnSalonType } from "../hooks/useVirtualTryOn";

// =============================================================================
// Types
// =============================================================================

interface DesignItem {
  _id: Id<"designCatalog">;
  organizationId: Id<"organization">;
  name: string;
  category: string;
  salonType: TryOnSalonType;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
}

interface TryOnDesignSelectionProps {
  salonType: TryOnSalonType;
  organizationId?: Id<"organization">;
  isFreePromptMode: boolean;
  promptText: string;
  categoryFilter: string;
  selectedDesign: SelectedDesign | null;
  selectedDesignId: Id<"designCatalog"> | null;
  designs: DesignItem[] | undefined;
  filteredDesigns: DesignItem[];
  categories: string[] | undefined;
  onSetSelectedDesign: (design: SelectedDesign | null) => void;
  onSetPromptText: (text: string) => void;
  onSetCategoryFilter: (filter: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function getPromptPlaceholder(salonType: TryOnSalonType): string {
  switch (salonType) {
    case "hair":
      return "e.g. Platinum blonde balayage with soft waves and face-framing layers";
    case "nail":
      return "e.g. Almond-shaped nails with marble effect in rose gold and white";
    case "makeup":
      return "e.g. Soft glam makeup with winged eyeliner and nude lip";
    case "multi":
      return "e.g. Describe the look you want to try...";
  }
}

function SelectedDesignBadge({
  name,
  category,
  onClear,
}: {
  name: string;
  category: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
      <Check className="h-4 w-4 text-primary" />
      <span className="font-medium text-sm">{name || "Design selected"}</span>
      {category && (
        <Badge variant="secondary" className="text-xs">
          {category}
        </Badge>
      )}
      <button
        type="button"
        className="ml-auto text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function TryOnDesignSelection({
  salonType,
  organizationId,
  isFreePromptMode,
  promptText,
  categoryFilter,
  selectedDesign,
  selectedDesignId,
  designs,
  filteredDesigns,
  categories,
  onSetSelectedDesign,
  onSetPromptText,
  onSetCategoryFilter,
}: TryOnDesignSelectionProps) {
  if (isFreePromptMode) {
    return (
      <div className="space-y-4 lg:col-span-3">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Describe Your Look</h3>
          <Textarea
            value={promptText}
            onChange={(e) => onSetPromptText(e.target.value)}
            placeholder={getPromptPlaceholder(salonType)}
            rows={3}
            className="resize-none"
          />
          <p className="text-muted-foreground text-xs">
            Be specific about colors, styles, and techniques for best results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:col-span-3">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Design Catalog</h3>

        {/* Single-org mode (organizationId prop provided) */}
        {organizationId ? (
          <>
            {/* Category Filter Tabs */}
            {categories && categories.length > 0 && (
              <Tabs value={categoryFilter} onValueChange={onSetCategoryFilter}>
                <TabsList className="flex-wrap">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Thumbnail Grid */}
            {designs === undefined ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {["a", "b", "c", "d", "e", "f", "g", "h"].map((key) => (
                  <Skeleton
                    key={`design-skeleton-${key}`}
                    className="aspect-square rounded-md"
                  />
                ))}
              </div>
            ) : filteredDesigns.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <p className="text-sm">No designs available</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {filteredDesigns.map((design) => (
                  <button
                    key={design._id}
                    type="button"
                    className={`group relative overflow-hidden rounded-md border-2 transition-all ${
                      selectedDesignId === design._id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    onClick={() =>
                      onSetSelectedDesign({
                        id: design._id,
                        organizationId: design.organizationId,
                        name: design.name,
                        category: design.category,
                        salonType: design.salonType as TryOnSalonType,
                      })
                    }
                  >
                    {design.thumbnailUrl || design.imageUrl ? (
                      // biome-ignore lint/performance/noImgElement: dynamic storage URL
                      <img
                        src={
                          design.thumbnailUrl ?? design.imageUrl ?? undefined
                        }
                        alt={design.name}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}

                    {selectedDesignId === design._id && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
                      <span className="truncate text-white text-xs">
                        {design.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected design badge */}
            {selectedDesign && (
              <SelectedDesignBadge
                name={selectedDesign.name}
                category={selectedDesign.category}
                onClear={() => onSetSelectedDesign(null)}
              />
            )}
          </>
        ) : (
          /* Multi-org mode (no organizationId prop) */
          <DesignBrowser
            selectedDesignId={selectedDesignId}
            onSelectDesign={(d) => {
              if (!d.id) {
                onSetSelectedDesign(null);
              } else {
                onSetSelectedDesign(d);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
