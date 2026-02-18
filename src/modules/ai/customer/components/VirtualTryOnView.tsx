"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  CREDIT_COSTS,
  SALON_TYPE_TRYON_MODE_MAP,
} from "../../../../../convex/lib/aiConstants";
import { DesignBrowser, type SelectedDesign } from "./DesignBrowser";

// =============================================================================
// Types
// =============================================================================

type TryOnSalonType = "hair" | "nail" | "makeup" | "multi";

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
}

// =============================================================================
// Constants
// =============================================================================

const PHOTO_HINTS: Record<TryOnSalonType, string> = {
  hair: "Upload a clear front-facing photo showing your hair",
  nail: "Upload a photo of your hand with fingers spread",
  makeup: "Upload a clear front-facing photo of your face",
  multi: "Upload a clear front-facing photo",
};

// =============================================================================
// Processing Skeleton
// =============================================================================

function ProcessingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-medium text-sm">Processing your try-on…</p>
          <p className="text-muted-foreground text-xs">
            Usually takes 15–30 seconds
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="mx-auto h-3 w-12" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="mx-auto h-3 w-12" />
          <Skeleton className="h-[280px] w-full rounded-md" />
        </div>
      </div>
    </div>
  );
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
}: VirtualTryOnViewProps) {
  // State — inputs
  const [selectedDesign, setSelectedDesign] = useState<SelectedDesign | null>(
    initialDesignId && initialOrganizationId
      ? {
          id: initialDesignId,
          organizationId: initialOrganizationId,
          name: "",
          category: "",
          salonType,
        }
      : null,
  );
  const selectedDesignId = selectedDesign?.id ?? null;
  // The org to use for simulation + gallery submission:
  // prefer the design's own org, then the prop org (salon context).
  const effectiveOrgId =
    selectedDesign?.organizationId ?? organizationId ?? null;

  const [isFreePromptMode, setIsFreePromptMode] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State — result
  const [activeSimulationId, setActiveSimulationId] =
    useState<Id<"aiSimulations"> | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // State — gallery
  const [galleryConsent, setGalleryConsent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref to track the latest previewUrl for unmount cleanup
  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  // Revoke blob URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const designs = useQuery(
    api.designCatalog.listByOrg,
    organizationId ? { organizationId } : "skip",
  );

  const categories = useQuery(
    api.designCatalog.getCategories,
    organizationId ? { organizationId } : "skip",
  );

  const activeSimulation = useQuery(
    api.aiSimulations.getSimulation,
    activeSimulationId ? { simulationId: activeSimulationId } : "skip",
  );

  const simulationHistory = useQuery(
    api.aiSimulations.listMySimulations,
    isAuthenticated ? { limit: 10 } : "skip",
  );

  const creditBalance = useQuery(
    api.aiCredits.getMyBalance,
    isAuthenticated ? {} : "skip",
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const createSimulation = useMutation(api.aiSimulations.createSimulation);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const submitToGalleryMut = useMutation(api.aiSimulations.submitToGallery);
  const getFileUrl = useMutation(api.files.getFileUrl);

  // ---------------------------------------------------------------------------
  // Image URL resolution for before/after slider
  // ---------------------------------------------------------------------------

  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeSimulation?.imageStorageId) {
      getFileUrl({ storageId: activeSimulation.imageStorageId }).then(
        (url) => setBeforeImageUrl(url),
        () => setBeforeImageUrl(null),
      );
    } else {
      setBeforeImageUrl(null);
    }
  }, [activeSimulation?.imageStorageId, getFileUrl]);

  useEffect(() => {
    if (activeSimulation?.resultImageStorageId) {
      getFileUrl({ storageId: activeSimulation.resultImageStorageId }).then(
        (url) => setAfterImageUrl(url),
        () => setAfterImageUrl(null),
      );
    } else {
      setAfterImageUrl(null);
    }
  }, [activeSimulation?.resultImageStorageId, getFileUrl]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const creditCost = CREDIT_COSTS.virtualTryOn;
  const hasInsufficientCredits =
    creditBalance !== undefined && creditBalance.balance < creditCost;
  const tryOnMode = SALON_TYPE_TRYON_MODE_MAP[salonType] ?? "face";

  const filteredDesigns = designs
    ? categoryFilter === "all"
      ? designs
      : designs.filter((d) => d.category === categoryFilter)
    : [];

  const canSubmit =
    selectedFile !== null &&
    (isFreePromptMode
      ? promptText.trim().length > 0
      : selectedDesignId !== null) &&
    !isUploading &&
    !hasInsufficientCredits;

  const isProcessing =
    activeSimulation !== undefined &&
    activeSimulation !== null &&
    (activeSimulation.status === "pending" ||
      activeSimulation.status === "processing");

  const isCompleted =
    activeSimulation !== undefined &&
    activeSimulation !== null &&
    activeSimulation.status === "completed";

  const isFailed =
    activeSimulation !== undefined &&
    activeSimulation !== null &&
    activeSimulation.status === "failed";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    // Revoke old preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Reset input so re-selecting the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function clearPhoto() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  }

  async function handleTryOn() {
    if (!selectedFile || !canSubmit) return;

    setIsUploading(true);
    try {
      // Upload image to Convex storage
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };

      // Create simulation — use the design's org (cross-org support) or the prop org
      const simulationId = await createSimulation({
        organizationId: effectiveOrgId ?? undefined,
        imageStorageId: storageId,
        simulationType: isFreePromptMode ? "prompt" : "catalog",
        designCatalogId: isFreePromptMode
          ? undefined
          : (selectedDesignId ?? undefined),
        promptText: isFreePromptMode ? promptText.trim() : undefined,
      });

      setActiveSimulationId(simulationId);

      // Clear upload state
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setGalleryConsent(false);

      toast.success("Try-on started! Results will appear shortly.");
    } catch (error) {
      if (error instanceof ConvexError) {
        const message =
          (error.data as { message?: string })?.message ?? "Try-on failed";
        toast.error(message);
      } else {
        toast.error("Failed to start try-on");
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleStartNew() {
    setActiveSimulationId(null);
    setSelectedDesign(null);
    setPromptText("");
    setGalleryConsent(false);
  }

  async function handleSubmitToGallery() {
    if (!activeSimulationId || !galleryConsent || !effectiveOrgId) return;

    try {
      await submitToGalleryMut({
        simulationId: activeSimulationId,
        organizationId: effectiveOrgId,
      });
      toast.success("Submitted to gallery! Pending salon approval.");
    } catch (error) {
      if (error instanceof ConvexError) {
        const message =
          (error.data as { message?: string })?.message ?? "Submission failed";
        toast.error(message);
      } else {
        toast.error("Failed to submit to gallery");
      }
    }
  }

  function handleSaveToMoodBoard() {
    // Stubbed for future implementation
    toast.info("Save to mood board coming soon!");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Credit Balance */}
      {creditBalance !== undefined && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2">
          <span className="text-muted-foreground text-sm">
            Credits:{" "}
            <span className="font-semibold text-foreground">
              {creditBalance.balance}
            </span>
          </span>
          <span className="text-muted-foreground text-xs">
            {creditCost} credits per try-on
          </span>
        </div>
      )}

      {/* ================================================================= */}
      {/* Processing State */}
      {/* ================================================================= */}
      {isProcessing && <ProcessingSkeleton />}

      {/* ================================================================= */}
      {/* Completed Result — Side-by-side comparison */}
      {/* ================================================================= */}
      {isCompleted && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Try-On Result</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSaveToMoodBoard}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleStartNew}>
                New Try-On
              </Button>
            </div>
          </div>

          {/* Side-by-side images */}
          <div className="grid grid-cols-2 gap-3">
            {/* Before */}
            <div className="space-y-1.5">
              <p className="text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Before
              </p>
              <div className="h-[280px] overflow-hidden rounded-md border bg-muted/50">
                {beforeImageUrl ? (
                  // biome-ignore lint/performance/noImgElement: dynamic storage URL
                  <img
                    src={beforeImageUrl}
                    alt="Original appearance"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </div>
            </div>

            {/* After */}
            <div className="space-y-1.5">
              <p className="text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                After
              </p>
              <div className="h-[280px] overflow-hidden rounded-md border bg-muted/50">
                {afterImageUrl ? (
                  // biome-ignore lint/performance/noImgElement: dynamic storage URL
                  <img
                    src={afterImageUrl}
                    alt="Try-on result"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </div>
            </div>
          </div>

          {/* Gallery consent — inline compact */}
          {effectiveOrgId && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5">
              {activeSimulation?.publicConsent ? (
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Submitted to gallery</span>
                </div>
              ) : (
                <>
                  <Checkbox
                    id="gallery-consent"
                    checked={galleryConsent}
                    onCheckedChange={(checked) =>
                      setGalleryConsent(checked === true)
                    }
                  />
                  <label
                    htmlFor="gallery-consent"
                    className="flex-1 cursor-pointer text-sm"
                  >
                    Share this result to the salon gallery
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!galleryConsent}
                    onClick={handleSubmitToGallery}
                  >
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                    Add to Gallery
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Failed State */}
      {/* ================================================================= */}
      {isFailed && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground text-sm">
              {activeSimulation?.errorMessage ??
                "Try-on failed. Please try again."}
            </p>
            <Button variant="outline" size="sm" onClick={handleStartNew}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Input State — Design Selection + Photo Upload */}
      {/* ================================================================= */}
      {!isProcessing && !isCompleted && !isFailed && (
        <>
          {/* Mode Toggle */}
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="font-medium text-sm">
                {isFreePromptMode
                  ? "Describe your look"
                  : "Choose from catalog"}
              </p>
              <p className="text-muted-foreground text-xs">
                {isFreePromptMode
                  ? "Type what you want to try"
                  : "Browse the salon's design catalog"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Free prompt</span>
              <Switch
                checked={isFreePromptMode}
                onCheckedChange={(checked) => {
                  setIsFreePromptMode(checked);
                  if (checked) {
                    setSelectedDesign(null);
                  } else {
                    setPromptText("");
                  }
                }}
              />
            </div>
          </div>

          {/* Catalog Browse */}
          {!isFreePromptMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  Design Catalog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ── Single-org mode (organizationId prop provided) ── */}
                {organizationId ? (
                  <>
                    {/* Category Filter Tabs */}
                    {categories && categories.length > 0 && (
                      <Tabs
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
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
                              setSelectedDesign({
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
                        onClear={() => setSelectedDesign(null)}
                      />
                    )}
                  </>
                ) : (
                  /* ── Multi-org mode (no organizationId prop) ── */
                  <DesignBrowser
                    selectedDesignId={selectedDesignId}
                    onSelectDesign={(d) => {
                      if (!d.id) {
                        setSelectedDesign(null);
                      } else {
                        setSelectedDesign(d);
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Free Prompt Input */}
          {isFreePromptMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4" />
                  Describe Your Look
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={getPromptPlaceholder(salonType)}
                  rows={3}
                  className="resize-none"
                />
                <p className="mt-2 text-muted-foreground text-xs">
                  Be specific about colors, styles, and techniques for best
                  results.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Photo Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />
                Your Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewUrl ? (
                <div className="group relative">
                  {/* biome-ignore lint/performance/noImgElement: dynamic blob URL */}
                  <img
                    src={previewUrl}
                    alt="Your upload preview"
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={clearPhoto}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-10 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">{PHOTO_HINTS[salonType]}</span>
                  <span className="text-xs">JPEG, PNG, or WebP up to 5MB</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Region hint */}
              <p className="text-muted-foreground text-xs">
                Detection mode:{" "}
                <Badge variant="secondary" className="text-xs">
                  {tryOnMode}
                </Badge>
              </p>
            </CardContent>
          </Card>

          {/* Try On Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={handleTryOn}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : hasInsufficientCredits ? (
              "Insufficient credits"
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Try On ({creditCost} credits)
              </>
            )}
          </Button>
        </>
      )}

      {/* ================================================================= */}
      {/* Try-On History */}
      {/* ================================================================= */}
      {simulationHistory && simulationHistory.length > 0 && (
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between py-2 text-sm"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            <span className="font-medium">
              Previous Try-Ons ({simulationHistory.length})
            </span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {simulationHistory.map((sim) => (
                <TryOnHistoryItem
                  key={sim._id}
                  simulation={sim}
                  isSelected={activeSimulationId === sim._id}
                  onSelect={setActiveSimulationId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

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
// Helper Functions
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
