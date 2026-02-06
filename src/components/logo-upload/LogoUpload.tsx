"use client";

import { useMutation } from "convex/react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

interface LogoUploadProps {
  organizationId: Id<"organization">;
  currentLogo?: string | null;
  onUploadComplete?: (url: string) => void;
  onDelete?: () => void;
  disabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// =============================================================================
// Component
// =============================================================================

export function LogoUpload({
  organizationId,
  currentLogo,
  onUploadComplete,
  onDelete,
  disabled = false,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogo ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with currentLogo prop changes
  useEffect(() => {
    setPreview(currentLogo ?? null);
  }, [currentLogo]);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveOrganizationLogo = useMutation(api.files.saveOrganizationLogo);
  const deleteOrganizationLogo = useMutation(api.files.deleteOrganizationLogo);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();

      // Step 3: Save logo reference
      const url = await saveOrganizationLogo({
        organizationId,
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      setPreview(url);
      onUploadComplete?.(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setPreview(currentLogo ?? null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!preview) return;

    setIsUploading(true);
    try {
      await deleteOrganizationLogo({ organizationId });
      setPreview(null);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Preview Area */}
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && !isUploading && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            triggerFileSelect();
          }
        }}
        aria-disabled={disabled || isUploading}
        aria-label={preview ? "Change logo" : "Upload logo"}
        className={`
          relative flex items-center justify-center
          w-32 h-32 border-2 border-dashed rounded-lg
          transition-colors cursor-pointer
          ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}
          ${error ? "border-destructive" : "border-muted-foreground/25"}
        `}
        onClick={!disabled && !isUploading ? triggerFileSelect : undefined}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <span className="text-xs">Uploading...</span>
          </div>
        ) : preview ? (
          <Image
            src={preview}
            alt="Logo preview"
            fill
            className="object-contain p-2 rounded-lg"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="size-8" />
            <span className="text-xs">Upload Logo</span>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
        >
          <Upload className="size-4 mr-2" />
          {preview ? "Change" : "Upload"}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={disabled || isUploading}
          >
            <Trash2 className="size-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Max 2MB. JPEG, PNG, or WebP.
      </p>
    </div>
  );
}
