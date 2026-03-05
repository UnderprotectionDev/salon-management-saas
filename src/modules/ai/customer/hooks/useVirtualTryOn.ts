"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getConvexErrorMessage } from "@/lib/convex-error";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  CREDIT_COSTS,
  SALON_TYPE_TRYON_MODE_MAP,
} from "../../../../../convex/lib/aiConstants";
import type { SelectedDesign } from "../components/DesignBrowser";

// =============================================================================
// Types
// =============================================================================

export type TryOnSalonType = "hair" | "nail" | "makeup" | "multi";

export interface UseVirtualTryOnOptions {
  salonType: TryOnSalonType;
  organizationId?: Id<"organization">;
  initialDesignId?: Id<"designCatalog"> | null;
  initialOrganizationId?: Id<"organization"> | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useVirtualTryOn({
  salonType,
  organizationId,
  initialDesignId,
  initialOrganizationId,
}: UseVirtualTryOnOptions) {
  // ---------------------------------------------------------------------------
  // State — inputs
  // ---------------------------------------------------------------------------

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

  // State — mood board
  const [savedToMoodBoard, setSavedToMoodBoard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const getFileUrl = useMutation(api.files.getFileUrl);
  const addToMoodBoard = useMutation(api.aiMoodBoard.addToMoodBoard);

  // ---------------------------------------------------------------------------
  // Image URL resolution for before/after
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

  const stepOneComplete = isFreePromptMode
    ? promptText.trim().length > 0
    : selectedDesignId !== null;
  const stepTwoComplete = selectedFile !== null;

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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

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

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success("Try-on started! Results will appear shortly.");
    } catch (error) {
      toast.error(getConvexErrorMessage(error, "Failed to start try-on"));
    } finally {
      setIsUploading(false);
    }
  }

  function handleStartNew() {
    setActiveSimulationId(null);
    setSelectedDesign(null);
    setPromptText("");
    setSavedToMoodBoard(false);
  }

  async function handleSaveToMoodBoard() {
    if (!activeSimulation?.resultImageStorageId || savedToMoodBoard) return;
    try {
      await addToMoodBoard({
        imageStorageId: activeSimulation.resultImageStorageId,
        source: "tryon",
        simulationId: activeSimulation._id,
        designCatalogId: activeSimulation.designCatalogId,
        organizationId: activeSimulation.organizationId,
        note: activeSimulation.promptText ?? undefined,
      });
      setSavedToMoodBoard(true);
      toast.success("Saved to mood board!");
    } catch {
      toast.error("Failed to save to mood board");
    }
  }

  function handleModeToggle(checked: boolean) {
    setIsFreePromptMode(checked);
    if (checked) {
      setSelectedDesign(null);
    } else {
      setPromptText("");
    }
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    selectedDesign,
    selectedDesignId,
    isFreePromptMode,
    promptText,
    categoryFilter,
    previewUrl,
    isUploading,
    activeSimulationId,
    showHistory,
    savedToMoodBoard,
    fileInputRef,

    // Queries
    designs,
    categories,
    activeSimulation,
    simulationHistory,
    creditBalance,

    // Resolved URLs
    beforeImageUrl,
    afterImageUrl,

    // Derived
    creditCost,
    hasInsufficientCredits,
    tryOnMode,
    filteredDesigns,
    canSubmit,
    isProcessing,
    isCompleted,
    isFailed,
    stepOneComplete,
    stepTwoComplete,

    // Setters
    setSelectedDesign,
    setPromptText,
    setCategoryFilter,
    setShowHistory,
    setActiveSimulationId,

    // Handlers
    handleFileSelect,
    clearPhoto,
    handleTryOn,
    handleStartNew,
    handleSaveToMoodBoard,
    handleModeToggle,
  };
}
