"use client";

import { Loader2, Sparkles, Upload, X } from "lucide-react";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TryOnSalonType } from "../hooks/useVirtualTryOn";

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
// Props
// =============================================================================

interface TryOnPhotoUploadProps {
  salonType: TryOnSalonType;
  previewUrl: string | null;
  isUploading: boolean;
  canSubmit: boolean;
  hasInsufficientCredits: boolean;
  creditCost: number;
  tryOnMode: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearPhoto: () => void;
  onTryOn: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function TryOnPhotoUpload({
  salonType,
  previewUrl,
  isUploading,
  canSubmit,
  hasInsufficientCredits,
  creditCost,
  tryOnMode,
  fileInputRef,
  onFileSelect,
  onClearPhoto,
  onTryOn,
}: TryOnPhotoUploadProps) {
  return (
    <div className="space-y-4 lg:col-span-2">
      <h3 className="font-semibold text-sm">Your Photo</h3>

      {previewUrl ? (
        <div className="group relative">
          {/* biome-ignore lint/performance/noImgElement: dynamic blob URL */}
          <img
            src={previewUrl}
            alt="Your upload preview"
            className="aspect-[3/4] w-full rounded-md border object-cover"
          />
          <button
            type="button"
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onClearPhoto}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
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
        onChange={onFileSelect}
      />

      {/* Region hint */}
      <p className="text-muted-foreground text-xs">
        Detection mode:{" "}
        <Badge variant="secondary" className="text-xs">
          {tryOnMode}
        </Badge>
      </p>

      {/* Try On Button */}
      <Button className="w-full" disabled={!canSubmit} onClick={onTryOn}>
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
    </div>
  );
}
