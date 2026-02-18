"use client";

import { useMutation } from "convex/react";
import {
  GripVertical,
  Heart,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

interface SimulationRecord {
  _id: Id<"aiSimulations">;
  imageStorageId: Id<"_storage">;
  resultImageStorageId?: Id<"_storage">;
  status: string;
  designCatalogId?: Id<"designCatalog">;
  simulationType: "catalog" | "prompt";
  promptText?: string;
  createdAt: number;
}

interface TryOnComparisonViewProps {
  simulations: SimulationRecord[];
  onClose: () => void;
}

type ResolvedUrls = Record<
  string,
  { before: string | null; after: string | null }
>;

// =============================================================================
// Before/After Slider (independent per cell)
// =============================================================================

function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  function getPositionFromEvent(clientX: number): number {
    const container = containerRef.current;
    if (!container) return 50;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  function handlePointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    setSliderPosition(getPositionFromEvent(e.clientX));
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    setSliderPosition(getPositionFromEvent(e.clientX));
  }

  function handlePointerUp() {
    isDragging.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full cursor-col-resize select-none overflow-hidden rounded-md border"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Before (original) — full width background */}
      {/* biome-ignore lint/performance/noImgElement: dynamic storage URL */}
      <img
        src={beforeUrl}
        alt="Original appearance"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* After (result) — clipped by slider */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        {/* biome-ignore lint/performance/noImgElement: dynamic storage URL */}
        <img
          src={afterUrl}
          alt="Try-on result"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-md"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/50 shadow-lg">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 z-10 rounded bg-black/50 px-2 py-0.5 text-white text-xs">
        Before
      </div>
      <div className="absolute top-2 right-2 z-10 rounded bg-black/50 px-2 py-0.5 text-white text-xs">
        After
      </div>
    </div>
  );
}

// =============================================================================
// Comparison Cell
// =============================================================================

function ComparisonCell({
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

// =============================================================================
// Selection Mode Card
// =============================================================================

function SelectionCard({
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

// =============================================================================
// Main Component
// =============================================================================

const MIN_COMPARE = 2;
const MAX_COMPARE = 4;

export function TryOnComparisonView({
  simulations,
  onClose,
}: TryOnComparisonViewProps) {
  const completedSimulations = simulations.filter(
    (s) => s.status === "completed" && s.resultImageStorageId,
  );

  // Mode: "select" for picking items, "compare" for grid view
  const [mode, setMode] = useState<"select" | "compare">("select");
  const [selectedIds, setSelectedIds] = useState<Set<Id<"aiSimulations">>>(
    new Set(),
  );
  const [resolvedUrls, setResolvedUrls] = useState<ResolvedUrls>({});

  const getFileUrl = useMutation(api.files.getFileUrl);

  // ---------------------------------------------------------------------------
  // Resolve image URLs for selected simulations when entering compare mode
  // ---------------------------------------------------------------------------

  const selectedSimulations = completedSimulations.filter((s) =>
    selectedIds.has(s._id),
  );

  // Use a ref to track resolved simulation IDs and avoid re-fetching already-resolved URLs
  const resolvedSimIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (mode !== "compare") return;
    const pending = selectedSimulations.filter(
      (s) => !resolvedSimIds.current.has(s._id as string),
    );
    if (pending.length === 0) return;

    for (const s of pending) {
      resolvedSimIds.current.add(s._id as string);
    }

    let cancelled = false;

    async function resolveUrls() {
      const newUrls: ResolvedUrls = {};

      for (const sim of pending) {
        const id = sim._id as string;
        try {
          const [beforeUrl, afterUrl] = await Promise.all([
            getFileUrl({ storageId: sim.imageStorageId }),
            sim.resultImageStorageId
              ? getFileUrl({ storageId: sim.resultImageStorageId })
              : Promise.resolve(null),
          ]);
          if (!cancelled) {
            newUrls[id] = { before: beforeUrl, after: afterUrl };
          }
        } catch {
          if (!cancelled) {
            newUrls[id] = { before: null, after: null };
          }
        }
      }

      if (!cancelled && Object.keys(newUrls).length > 0) {
        setResolvedUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }

    resolveUrls();
    return () => {
      cancelled = true;
    };
  }, [mode, selectedIds, getFileUrl, completedSimulations]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleToggle(id: Id<"aiSimulations">) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      }
      return next;
    });
  }

  function handleCompare() {
    if (selectedIds.size >= MIN_COMPARE) {
      setMode("compare");
    }
  }

  function handleBackToSelect() {
    setMode("select");
  }

  function handleFavorite(_id: Id<"aiSimulations">) {
    // Stub — will save to Mood Board in a future milestone
    toast.info("Save to mood board coming soon!");
  }

  // ---------------------------------------------------------------------------
  // Grid class based on count
  // ---------------------------------------------------------------------------

  function getGridClass(count: number): string {
    if (count <= 2) {
      // Side by side on desktop, stack on mobile
      return "grid grid-cols-1 gap-4 sm:grid-cols-2";
    }
    // 2x2 grid on desktop, stack on mobile
    return "grid grid-cols-1 gap-4 sm:grid-cols-2";
  }

  // ---------------------------------------------------------------------------
  // Not enough completed results
  // ---------------------------------------------------------------------------

  if (completedSimulations.length < MIN_COMPARE) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Compare Try-Ons</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-center text-muted-foreground text-sm">
              You need at least {MIN_COMPARE} completed try-on results to
              compare. You currently have {completedSimulations.length}.
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Comparison Grid View
  // ---------------------------------------------------------------------------

  if (mode === "compare") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            Comparing {selectedSimulations.length} Results
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBackToSelect}>
              Change Selection
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className={getGridClass(selectedSimulations.length)}>
          {selectedSimulations.map((sim) => (
            <ComparisonCell
              key={sim._id}
              simulation={sim}
              urls={
                resolvedUrls[sim._id as string] ?? {
                  before: null,
                  after: null,
                }
              }
              onFavorite={handleFavorite}
            />
          ))}
        </div>

        {/* Exit */}
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Exit Comparison
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Selection View
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Compare Try-Ons</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Instructions */}
      <p className="text-muted-foreground text-sm">
        Select {MIN_COMPARE}&ndash;{MAX_COMPARE} completed results to compare
        side by side.
      </p>

      {/* Selection count badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant={selectedIds.size >= MIN_COMPARE ? "default" : "secondary"}
        >
          {selectedIds.size} / {MAX_COMPARE} selected
        </Badge>
        {selectedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Simulation list */}
      <div className="space-y-2">
        {completedSimulations.map((sim) => (
          <SelectionCard
            key={sim._id}
            simulation={sim}
            checked={selectedIds.has(sim._id)}
            disabled={selectedIds.size >= MAX_COMPARE}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Compare button */}
      <Button
        className="w-full"
        size="lg"
        disabled={selectedIds.size < MIN_COMPARE}
        onClick={handleCompare}
      >
        Compare {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
      </Button>
    </div>
  );
}
