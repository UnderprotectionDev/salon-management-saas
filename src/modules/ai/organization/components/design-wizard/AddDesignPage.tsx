"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { CategoryStep } from "./CategoryStep";
import {
  type DesignSalonType,
  type OrgSalonType,
  toDesignSalonType,
} from "./category-presets";
import { DetailsStep } from "./DetailsStep";
import { ImageUploadStep } from "./ImageUploadStep";

// =============================================================================
// Types
// =============================================================================

interface WizardState {
  step: number;
  category: string;
  serviceArea: DesignSalonType;
  imageFile: File | null;
  imagePreview: string | null;
  name: string;
  description: string;
  tags: string[];
}

const INITIAL_STATE: WizardState = {
  step: 1,
  category: "",
  serviceArea: "hair",
  imageFile: null,
  imagePreview: null,
  name: "",
  description: "",
  tags: [],
};

const STEP_LABELS = ["Category", "Image", "Details"];

// =============================================================================
// Progress Stepper
// =============================================================================

function ProgressStepper({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center gap-2">
            {/* Step indicator */}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                isCompleted
                  ? "border-foreground bg-foreground text-background"
                  : isCurrent
                    ? "border-foreground bg-background text-foreground"
                    : "border-border bg-background text-muted-foreground"
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
            </div>

            {/* Label */}
            <span
              className={`hidden text-sm sm:inline ${
                isCurrent
                  ? "font-medium text-foreground"
                  : isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {STEP_LABELS[i]}
            </span>

            {/* Connector line */}
            {i < totalSteps - 1 && (
              <div
                className={`mx-1 h-0.5 w-8 sm:w-12 ${
                  isCompleted ? "bg-foreground" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Add Design Page (Wizard Container)
// =============================================================================

interface AddDesignPageProps {
  /** When provided, the wizard pre-fills from an existing design (edit mode). */
  editMode?: {
    designId: Id<"designCatalog">;
    initialState: Omit<WizardState, "step" | "imageFile"> & {
      existingImageUrl: string | null;
    };
  };
}

export function AddDesignPage({ editMode }: AddDesignPageProps) {
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const createDesign = useMutation(api.designCatalog.create);
  const updateDesign = useMutation(api.designCatalog.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const salonTypes = activeOrganization?.salonType ?? null;
  const orgSalonType: OrgSalonType | null =
    salonTypes && salonTypes.length > 0
      ? salonTypes.length > 1
        ? "multi"
        : (salonTypes[0] as OrgSalonType)
      : null;
  const isMulti = orgSalonType === "multi";

  const [state, setState] = useState<WizardState>(() => {
    if (editMode) {
      return {
        step: 1,
        category: editMode.initialState.category,
        serviceArea: editMode.initialState.serviceArea,
        imageFile: null,
        imagePreview: editMode.initialState.existingImageUrl,
        name: editMode.initialState.name,
        description: editMode.initialState.description,
        tags: editMode.initialState.tags,
      };
    }
    return {
      ...INITIAL_STATE,
      serviceArea: isMulti ? "hair" : toDesignSalonType(orgSalonType),
    };
  });

  const [submitting, setSubmitting] = useState(false);

  if (!activeOrganization) return null;

  const organizationId = activeOrganization._id;
  const slug = activeOrganization.slug ?? activeOrganization._id;

  // ---- Navigation ----

  function goToStep(step: number) {
    setState((s) => ({ ...s, step }));
  }

  function canGoNext(): boolean {
    switch (state.step) {
      case 1:
        return state.category.length > 0;
      case 2:
        // In edit mode, existing image is fine even without a new file
        return editMode
          ? !!(state.imageFile || state.imagePreview)
          : !!state.imageFile;
      case 3:
        return state.name.trim().length > 0;
      default:
        return false;
    }
  }

  function handleNext() {
    if (state.step < 3) {
      goToStep(state.step + 1);
    }
  }

  function handleBack() {
    if (state.step > 1) {
      goToStep(state.step - 1);
    } else {
      router.push(`/${slug}/ai`);
    }
  }

  // ---- Upload helper ----

  async function uploadImage(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Failed to upload image");
    const result = (await response.json()) as { storageId: Id<"_storage"> };
    return result.storageId;
  }

  // ---- Submit ----

  async function handleSubmit(status: "active" | "inactive") {
    if (!state.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!state.category) {
      toast.error("Category is required");
      return;
    }
    if (!editMode && !state.imageFile) {
      toast.error("Please upload an image");
      return;
    }

    setSubmitting(true);
    try {
      if (editMode) {
        // ---- Update existing design ----
        let newStorageId: Id<"_storage"> | undefined;
        if (state.imageFile) {
          newStorageId = await uploadImage(state.imageFile);
        }
        await updateDesign({
          organizationId,
          designId: editMode.designId,
          name: state.name.trim(),
          category: state.category,
          description: state.description.trim() || undefined,
          tags: state.tags,
          salonType: toDesignSalonType(
            orgSalonType,
            isMulti ? state.serviceArea : undefined,
          ),
          ...(newStorageId ? { imageStorageId: newStorageId } : {}),
        });
        toast.success("Design updated");
      } else {
        // ---- Create new design ----
        if (!state.imageFile) {
          toast.error("Please upload an image");
          return;
        }
        const storageId = await uploadImage(state.imageFile);
        await createDesign({
          organizationId,
          name: state.name.trim(),
          category: state.category,
          imageStorageId: storageId,
          description: state.description.trim() || undefined,
          tags: state.tags,
          salonType: toDesignSalonType(
            orgSalonType,
            isMulti ? state.serviceArea : undefined,
          ),
          status,
        });
        toast.success(
          status === "active"
            ? "Design published to catalog"
            : "Design saved as draft",
        );
      }

      router.push(`/${slug}/ai`);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string }).message ?? "Error")
          : editMode
            ? "Failed to update design"
            : "Failed to create design",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render ----

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">
                {editMode ? "Edit Design" : "Add New Design"}
              </h1>
              <p className="text-muted-foreground text-xs">
                Design Studio &rsaquo; {editMode ? "Edit" : "New Design"}
              </p>
            </div>
          </div>

          <ProgressStepper currentStep={state.step} totalSteps={3} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-8">
        {state.step === 1 && (
          <CategoryStep
            orgSalonType={orgSalonType}
            isMulti={isMulti}
            serviceArea={state.serviceArea}
            selectedCategory={state.category}
            onServiceAreaChange={(area) =>
              setState((s) => ({ ...s, serviceArea: area, category: "" }))
            }
            onCategorySelect={(category) => {
              setState((s) => ({ ...s, category }));
              // Auto-advance after category selection
              setTimeout(() => goToStep(2), 200);
            }}
          />
        )}

        {state.step === 2 && (
          <ImageUploadStep
            category={state.category}
            imageFile={state.imageFile}
            imagePreview={state.imagePreview}
            onImageChange={(file, preview) => {
              // Revoke old preview URL
              if (
                state.imagePreview?.startsWith("blob:") &&
                state.imagePreview !== preview
              ) {
                URL.revokeObjectURL(state.imagePreview);
              }
              setState((s) => ({
                ...s,
                imageFile: file,
                imagePreview: preview,
              }));
            }}
            onClearImage={() => {
              if (state.imagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(state.imagePreview);
              }
              setState((s) => ({
                ...s,
                imageFile: null,
                imagePreview: editMode?.initialState.existingImageUrl ?? null,
              }));
            }}
            onCategoryChange={() => goToStep(1)}
          />
        )}

        {state.step === 3 && (
          <DetailsStep
            category={state.category}
            name={state.name}
            description={state.description}
            tags={state.tags}
            imagePreview={state.imagePreview}
            disabled={submitting}
            onNameChange={(name) => setState((s) => ({ ...s, name }))}
            onDescriptionChange={(description) =>
              setState((s) => ({ ...s, description }))
            }
            onTagsChange={(tags) => setState((s) => ({ ...s, tags }))}
          />
        )}
      </div>

      {/* Footer navigation */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Button variant="outline" onClick={handleBack} disabled={submitting}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {state.step === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex items-center gap-2">
            {state.step === 3 && !editMode && (
              <Button
                variant="outline"
                onClick={() => handleSubmit("inactive")}
                disabled={!canGoNext() || submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Save as Draft
              </Button>
            )}

            {state.step < 3 ? (
              <Button onClick={handleNext} disabled={!canGoNext()}>
                Next
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit("active")}
                disabled={!canGoNext() || submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                {editMode ? "Save Changes" : "Publish Design"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
