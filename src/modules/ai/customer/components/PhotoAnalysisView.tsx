"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  AlertCircle,
  Camera,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import {
  CREDIT_COSTS,
  MAX_PHOTOS_BY_TYPE,
  PHOTO_ANGLE_LABELS,
} from "../../../../../convex/lib/aiConstants";
import { QuickQuestionsPanel } from "./QuickQuestionsPanel";

// =============================================================================
// Types
// =============================================================================

type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";

interface AnalysisFeature {
  name: string;
  value: string;
  description: string;
}

interface RecommendedService {
  serviceName: string;
  reason: string;
}

interface CareTip {
  title: string;
  description: string;
}

interface ProductRecommendation {
  productName: string;
  reason: string;
}

interface AnalysisResult {
  features: AnalysisFeature[];
  recommendedServices: RecommendedService[];
  careTips: CareTip[];
  productRecommendations: ProductRecommendation[];
  summary: string;
}

// =============================================================================
// Subcomponents
// =============================================================================

function AnalysisLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Analyzing your photo...</span>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}

function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const [showProducts, setShowProducts] = useState(false);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.features.map((feature) => (
              <div key={feature.name} className="rounded-md border p-3">
                <div className="font-medium text-sm">{feature.name}</div>
                <div className="text-primary text-sm">{feature.value}</div>
                <div className="mt-1 text-muted-foreground text-xs">
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Services */}
      {result.recommendedServices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4" />
              Recommended Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.recommendedServices.map((service) => (
                <div
                  key={service.serviceName}
                  className="flex items-start gap-2"
                >
                  <Badge variant="secondary" className="mt-0.5 shrink-0">
                    {service.serviceName}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {service.reason}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care Tips */}
      {result.careTips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Care Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.careTips.map((tip) => (
                <div key={tip.title}>
                  <div className="font-medium text-sm">{tip.title}</div>
                  <div className="text-muted-foreground text-sm">
                    {tip.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Recommendations (collapsible) */}
      {result.productRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex w-full items-center justify-between"
              onClick={() => setShowProducts((prev) => !prev)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" />
                Product Suggestions
              </CardTitle>
              {showProducts ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          {showProducts && (
            <CardContent>
              <div className="space-y-2">
                {result.productRecommendations.map((product) => (
                  <div key={product.productName}>
                    <div className="font-medium text-sm">
                      {product.productName}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {product.reason}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function AnalysisHistoryItem({
  analysis,
  onSelect,
  isSelected,
}: {
  analysis: Doc<"aiAnalyses">;
  onSelect: (id: Id<"aiAnalyses">) => void;
  isSelected: boolean;
}) {
  const date = new Date(analysis.createdAt);

  return (
    <button
      type="button"
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={() => onSelect(analysis._id)}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">
          {analysis.salonType.charAt(0).toUpperCase() +
            analysis.salonType.slice(1)}{" "}
          Analysis
        </div>
        <Badge
          variant={
            analysis.status === "completed"
              ? "default"
              : analysis.status === "failed"
                ? "destructive"
                : "secondary"
          }
        >
          {analysis.status}
        </Badge>
      </div>
      <div className="mt-1 text-muted-foreground text-xs">
        {date.toLocaleDateString()} &middot; {analysis.imageStorageIds.length}{" "}
        photo{analysis.imageStorageIds.length > 1 ? "s" : ""} &middot;{" "}
        {analysis.creditCost} credits
      </div>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface PhotoAnalysisViewProps {
  salonType: SalonType;
  /** Optional: when provided, enables service matching from this salon's catalog */
  organizationId?: Id<"organization">;
}

export function PhotoAnalysisView({
  salonType,
  organizationId,
}: PhotoAnalysisViewProps) {
  // State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] =
    useState<Id<"aiAnalyses"> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref to track the latest previewUrls for unmount cleanup
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = previewUrls;

  // Revoke any remaining blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  // Queries
  const activeAnalysis = useQuery(
    api.aiAnalysis.getAnalysis,
    activeAnalysisId ? { analysisId: activeAnalysisId } : "skip",
  );

  const analysisHistory = useQuery(
    api.aiAnalysis.listMyAnalyses,
    isAuthenticated ? { limit: 10 } : "skip",
  );

  const creditBalance = useQuery(
    api.aiCredits.getMyBalance,
    isAuthenticated ? {} : "skip",
  );

  // Mutations
  const createAnalysis = useMutation(api.aiAnalysis.createAnalysis);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Derived
  const maxPhotos = MAX_PHOTOS_BY_TYPE[salonType] ?? 1;
  const angleLabels = PHOTO_ANGLE_LABELS[salonType] ?? ["Photo"];
  const isMultiImage = selectedFiles.length > 1;
  const creditCost = isMultiImage
    ? CREDIT_COSTS.photoAnalysisMulti
    : CREDIT_COSTS.photoAnalysisSingle;
  const hasInsufficientCredits =
    creditBalance !== undefined && creditBalance.balance < creditCost;

  // ---- Handlers ----

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = maxPhotos - selectedFiles.length;
    const newFiles = files.slice(0, remaining);

    // Validate file types and sizes
    for (const file of newFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
    }

    const updatedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(updatedFiles);

    // Generate preview URLs
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      // Upload all images to Convex storage
      const storageIds: Id<"_storage">[] = [];
      for (const file of selectedFiles) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error("Failed to upload image");
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        storageIds.push(storageId);
      }

      // Create analysis
      const analysisId = await createAnalysis({
        organizationId,
        imageStorageIds: storageIds,
        salonType,
      });

      setActiveAnalysisId(analysisId);

      // Clear selected files
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
      setSelectedFiles([]);
      setPreviewUrls([]);

      toast.success("Analysis started! Results will appear shortly.");
    } catch (error) {
      if (error instanceof ConvexError) {
        const message =
          (error.data as { message?: string })?.message ?? "Analysis failed";
        toast.error(message);
      } else {
        toast.error("Failed to start analysis");
      }
    } finally {
      setIsUploading(false);
    }
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      {creditBalance !== undefined && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2">
          <span className="text-muted-foreground text-sm">
            Your credits:{" "}
            <span className="font-medium text-foreground">
              {creditBalance.balance}
            </span>
          </span>
          <span className="text-muted-foreground text-xs">
            Analysis costs {creditCost} credits
          </span>
        </div>
      )}

      {/* Active Analysis Result or Upload Area */}
      {activeAnalysis &&
      activeAnalysis.status !== "completed" &&
      activeAnalysis.status !== "failed" ? (
        <AnalysisLoadingSkeleton />
      ) : activeAnalysis &&
        activeAnalysis.status === "completed" &&
        activeAnalysis.result ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Analysis Results</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveAnalysisId(null);
              }}
            >
              New Analysis
            </Button>
          </div>
          <AnalysisResultCard
            result={activeAnalysis.result as AnalysisResult}
          />

          {/* Quick Questions */}
          <QuickQuestionsPanel
            analysisId={activeAnalysis._id}
            salonType={salonType}
            organizationId={organizationId}
            creditBalance={creditBalance?.balance ?? 0}
          />
        </div>
      ) : activeAnalysis && activeAnalysis.status === "failed" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground text-sm">
              {activeAnalysis.errorMessage ??
                "Analysis failed. Please try again."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveAnalysisId(null)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Upload Area */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-5 w-5" />
              Upload Photo{maxPhotos > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={url} className="group relative">
                    {/* biome-ignore lint/performance/noImgElement: dynamic blob/storage URL */}
                    <img
                      src={url}
                      alt={angleLabels[index] ?? `Photo ${index + 1}`}
                      className="h-32 w-full rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="mt-1 text-center text-muted-foreground text-xs">
                      {angleLabels[index] ?? `Photo ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button / drop area */}
            {selectedFiles.length < maxPhotos && (
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">
                  {selectedFiles.length === 0
                    ? "Click to upload a photo"
                    : `Add another angle (${selectedFiles.length}/${maxPhotos})`}
                </span>
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

            {/* Analyze button */}
            {selectedFiles.length > 0 && (
              <Button
                className="w-full"
                disabled={isUploading || hasInsufficientCredits}
                onClick={handleAnalyze}
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
                    Analyze ({creditCost} credits)
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis History */}
      {analysisHistory && analysisHistory.length > 0 && (
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between py-2 text-sm"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            <span className="font-medium">
              Previous Analyses ({analysisHistory.length})
            </span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {analysisHistory.map((analysis) => (
                <AnalysisHistoryItem
                  key={analysis._id}
                  analysis={analysis}
                  onSelect={setActiveAnalysisId}
                  isSelected={activeAnalysisId === analysis._id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
