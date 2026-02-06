"use client";

import { useMutation } from "convex/react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ServiceImageUploadProps = {
  organizationId: Id<"organization">;
  serviceId?: Id<"services">;
  currentImage?: string | null;
  onUploadComplete?: (url: string) => void;
  disabled?: boolean;
};

export function ServiceImageUpload({
  organizationId,
  serviceId,
  currentImage,
  onUploadComplete,
  disabled = false,
}: ServiceImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveServiceImage = useMutation(api.files.saveServiceImage);
  const getFileUrl = useMutation(api.files.getFileUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

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

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) throw new Error("Failed to upload file");
      const { storageId } = await response.json();

      if (serviceId) {
        // Save directly to service if we have an ID
        const url = await saveServiceImage({
          organizationId,
          serviceId,
          storageId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
        setPreview(url);
        onUploadComplete?.(url);
      } else {
        // For new services without serviceId, convert storageId to URL
        const url = await getFileUrl({ storageId });
        if (url) {
          onUploadComplete?.(url);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setPreview(currentImage ?? null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        onKeyDown={(e) => {
          if (
            !disabled &&
            !isUploading &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            triggerFileSelect();
          }
        }}
        aria-disabled={disabled || isUploading}
        aria-label={preview ? "Change image" : "Upload image"}
        className={`
          relative flex items-center justify-center
          w-full h-32 border-2 border-dashed rounded-lg
          transition-colors cursor-pointer
          ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}
          ${error ? "border-destructive" : "border-muted-foreground/25"}
        `}
        onClick={!disabled && !isUploading ? triggerFileSelect : undefined}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <span className="text-xs">Uploading...</span>
          </div>
        ) : preview ? (
          <Image
            src={preview}
            alt="Service image preview"
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="size-6" />
            <span className="text-xs">Upload Image</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {preview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
        >
          <Upload className="size-4 mr-2" />
          Change Image
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Max 2MB. JPEG, PNG, or WebP.
      </p>
    </div>
  );
}
