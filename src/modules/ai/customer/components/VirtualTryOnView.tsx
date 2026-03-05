"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useVirtualTryOn, type TryOnSalonType } from "../hooks/useVirtualTryOn";
import { TryOnDesignSelection } from "./TryOnDesignSelection";
import { TryOnPhotoUpload } from "./TryOnPhotoUpload";
import {
  ProcessingSkeleton,
  TryOnCompletedResult,
  TryOnFailedResult,
} from "./TryOnResultDisplay";

// =============================================================================
// Types
// =============================================================================

interface VirtualTryOnViewProps {
  salonType: TryOnSalonType;
  /**
   * When provided, catalog mode is locked to this org's designs.
   * When absent, DesignBrowser lets the user pick from any of their salons.
   */
  organizationId?: Id<"organization">;
  /** Pre-select a design (for deep-linking from portfolio page). */
  initialDesignId?: Id<"designCatalog"> | null;
  /** The org that owns initialDesignId. */
  initialOrganizationId?: Id<"organization"> | null;
  /** Navigate to Mood Board section after saving */
  onNavigateToMoodBoard?: () => void;
}

// =============================================================================
// History Item
// =============================================================================

function TryOnHistoryItem({
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

// =============================================================================
// Main Component
// =============================================================================

export function VirtualTryOnView({
  salonType,
  organizationId,
  initialDesignId,
  initialOrganizationId,
  onNavigateToMoodBoard,
}: VirtualTryOnViewProps) {
  const tryOn = useVirtualTryOn({
    salonType,
    organizationId,
    initialDesignId,
    initialOrganizationId,
  });

  return (
    <div className="space-y-5">
      {/* ================================================================= */}
      {/* Processing State */}
      {/* ================================================================= */}
      {tryOn.isProcessing && <ProcessingSkeleton />}

      {/* ================================================================= */}
      {/* Completed Result — Side-by-side comparison */}
      {/* ================================================================= */}
      {tryOn.isCompleted && (
        <TryOnCompletedResult
          beforeImageUrl={tryOn.beforeImageUrl}
          afterImageUrl={tryOn.afterImageUrl}
          savedToMoodBoard={tryOn.savedToMoodBoard}
          hasResultImage={!!tryOn.activeSimulation?.resultImageStorageId}
          onSaveToMoodBoard={tryOn.handleSaveToMoodBoard}
          onNavigateToMoodBoard={onNavigateToMoodBoard}
          onStartNew={tryOn.handleStartNew}
        />
      )}

      {/* ================================================================= */}
      {/* Failed State */}
      {/* ================================================================= */}
      {tryOn.isFailed && (
        <TryOnFailedResult
          errorMessage={tryOn.activeSimulation?.errorMessage}
          onStartNew={tryOn.handleStartNew}
        />
      )}

      {/* ================================================================= */}
      {/* Input State — Design Selection + Photo Upload */}
      {/* ================================================================= */}
      {!tryOn.isProcessing && !tryOn.isCompleted && !tryOn.isFailed && (
        <>
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-0">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex size-5 items-center justify-center rounded-full border text-xs font-medium ${
                  tryOn.stepOneComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                1
              </div>
              <span
                className={`text-xs ${tryOn.stepOneComplete ? "text-foreground" : "text-muted-foreground"}`}
              >
                Pick a style
              </span>
            </div>
            <div className="mx-2 h-px w-8 bg-border" />
            <div className="flex items-center gap-1.5">
              <div
                className={`flex size-5 items-center justify-center rounded-full border text-xs font-medium ${
                  tryOn.stepTwoComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                2
              </div>
              <span
                className={`text-xs ${tryOn.stepTwoComplete ? "text-foreground" : "text-muted-foreground"}`}
              >
                Upload photo
              </span>
            </div>
            <div className="mx-2 h-px w-8 bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/40 text-xs font-medium text-muted-foreground">
                3
              </div>
              <span className="text-xs text-muted-foreground">Try on</span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="font-medium text-sm">
                {tryOn.isFreePromptMode
                  ? "Describe your look"
                  : "Choose from catalog"}
              </p>
              <p className="text-muted-foreground text-xs">
                {tryOn.isFreePromptMode
                  ? "Type what you want to try"
                  : "Browse the salon's design catalog"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Free prompt</span>
              <Switch
                checked={tryOn.isFreePromptMode}
                onCheckedChange={tryOn.handleModeToggle}
              />
            </div>
          </div>

          {/* 2-Column Layout: Style/Prompt (left) + Photo Upload (right) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* Left Column — Design Catalog or Prompt */}
            <TryOnDesignSelection
              salonType={salonType}
              organizationId={organizationId}
              isFreePromptMode={tryOn.isFreePromptMode}
              promptText={tryOn.promptText}
              categoryFilter={tryOn.categoryFilter}
              selectedDesign={tryOn.selectedDesign}
              selectedDesignId={tryOn.selectedDesignId}
              designs={tryOn.designs}
              filteredDesigns={tryOn.filteredDesigns}
              categories={tryOn.categories}
              onSetSelectedDesign={tryOn.setSelectedDesign}
              onSetPromptText={tryOn.setPromptText}
              onSetCategoryFilter={tryOn.setCategoryFilter}
            />

            {/* Right Column — Photo Upload + Try On Button */}
            <TryOnPhotoUpload
              salonType={salonType}
              previewUrl={tryOn.previewUrl}
              isUploading={tryOn.isUploading}
              canSubmit={tryOn.canSubmit}
              hasInsufficientCredits={tryOn.hasInsufficientCredits}
              creditCost={tryOn.creditCost}
              tryOnMode={tryOn.tryOnMode}
              fileInputRef={tryOn.fileInputRef}
              onFileSelect={tryOn.handleFileSelect}
              onClearPhoto={tryOn.clearPhoto}
              onTryOn={tryOn.handleTryOn}
            />
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* Try-On History */}
      {/* ================================================================= */}
      {tryOn.simulationHistory && tryOn.simulationHistory.length > 0 && (
        <div>
          <Separator className="mb-3" />
          <button
            type="button"
            className="flex w-full items-center justify-between py-2 text-sm"
            onClick={() => tryOn.setShowHistory((prev) => !prev)}
          >
            <span className="font-medium">
              Previous Try-Ons ({tryOn.simulationHistory.length})
            </span>
            {tryOn.showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {tryOn.showHistory && (
            <div className="mt-2 space-y-2">
              {tryOn.simulationHistory.map((sim) => (
                <TryOnHistoryItem
                  key={sim._id}
                  simulation={sim}
                  isSelected={tryOn.activeSimulationId === sim._id}
                  onSelect={tryOn.setActiveSimulationId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
