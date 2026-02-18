"use client";

/**
 * DesignBrowser — cross-org design catalog browser for authenticated users.
 *
 * Shows designs from all salons the user has a customer profile in.
 * Allows filtering by salon and category, with a "Try This" callback.
 */

import { useQuery } from "convex/react";
import { Check, Image as ImageIcon, Store } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

export interface SelectedDesign {
  id: Id<"designCatalog">;
  organizationId: Id<"organization">;
  name: string;
  category: string;
  salonType: "hair" | "nail" | "makeup" | "multi";
}

interface DesignBrowserProps {
  onSelectDesign: (design: SelectedDesign) => void;
  selectedDesignId?: Id<"designCatalog"> | null;
}

// =============================================================================
// Inner component that loads designs for a specific org
// (Convex hooks must be called unconditionally)
// =============================================================================

function OrgDesignGrid({
  organizationId,
  categoryFilter,
  selectedDesignId,
  onSelectDesign,
}: {
  organizationId: Id<"organization">;
  categoryFilter: string;
  selectedDesignId?: Id<"designCatalog"> | null;
  onSelectDesign: (design: SelectedDesign) => void;
}) {
  const designs = useQuery(api.designCatalog.listByOrg, { organizationId });

  if (designs === undefined) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <Skeleton key={k} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  }

  const filtered =
    categoryFilter === "all"
      ? designs
      : designs.filter((d) => d.category === categoryFilter);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <ImageIcon className="h-8 w-8" />
        <p className="text-sm">No designs in this category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {filtered.map((design) => {
        const isSelected = selectedDesignId === design._id;
        return (
          <button
            key={design._id}
            type="button"
            className={`group relative overflow-hidden rounded-md border-2 transition-all ${
              isSelected
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent hover:border-muted-foreground/30"
            }`}
            onClick={() =>
              onSelectDesign({
                id: design._id,
                organizationId: design.organizationId,
                name: design.name,
                category: design.category,
                salonType: design.salonType,
              })
            }
          >
            {design.thumbnailUrl || design.imageUrl ? (
              // biome-ignore lint/performance/noImgElement: dynamic storage URL
              <img
                src={design.thumbnailUrl ?? design.imageUrl}
                alt={design.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}

            {isSelected && (
              <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
              <span className="truncate text-white text-xs">{design.name}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Category tabs derived from loaded designs
// =============================================================================

function CategoryTabs({
  organizationId,
  value,
  onChange,
}: {
  organizationId: Id<"organization">;
  value: string;
  onChange: (cat: string) => void;
}) {
  const categories = useQuery(api.designCatalog.getCategories, {
    organizationId,
  });

  if (!categories || categories.length === 0) return null;

  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="all">All</TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {cat}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DesignBrowser({
  onSelectDesign,
  selectedDesignId,
}: DesignBrowserProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organization"> | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState("all");

  // All customer profiles (cross-org)
  const profiles = useQuery(api.customers.getMyProfiles, {});

  // Resolved selected org
  const activeOrgId = selectedOrgId ?? profiles?.[0]?.organizationId ?? null;

  // Loading state
  if (profiles === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton key={k} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // No profiles — user hasn't booked at any salon
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
        <Store className="h-10 w-10" />
        <p className="text-sm">
          You haven&apos;t booked at any salon yet.
          <br />
          Visit a salon&apos;s page to make your first booking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Salon selector */}
      {profiles.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Salon:</span>
          <Select
            value={activeOrgId ?? ""}
            onValueChange={(val) => {
              setSelectedOrgId(val as Id<"organization">);
              setCategoryFilter("all");
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Choose a salon" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.organizationId} value={p.organizationId}>
                  {p.organizationName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Single-salon label (no dropdown needed) */}
      {profiles.length === 1 && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Store className="h-4 w-4" />
          <span>{profiles[0].organizationName}</span>
        </div>
      )}

      {/* Category filter */}
      {activeOrgId && (
        <CategoryTabs
          organizationId={activeOrgId}
          value={categoryFilter}
          onChange={(cat) => setCategoryFilter(cat)}
        />
      )}

      {/* Design grid */}
      {activeOrgId ? (
        <OrgDesignGrid
          organizationId={activeOrgId}
          categoryFilter={categoryFilter}
          selectedDesignId={selectedDesignId}
          onSelectDesign={(design) => {
            onSelectDesign(design);
          }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">Select a salon to browse designs</p>
        </div>
      )}
    </div>
  );
}
