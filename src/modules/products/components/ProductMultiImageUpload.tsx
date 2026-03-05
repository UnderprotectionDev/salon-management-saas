"use client";

import { useMutation } from "convex/react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 4;

type PendingImage = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

type ProductMultiImageUploadProps = {
  /** For existing products — uses mutations directly */
  productId?: Id<"products">;
  organizationId: Id<"organization">;
  currentImageUrls?: string[];
  currentStorageIds?: Id<"_storage">[];
  /** For new products — collects storageIds */
  onImagesChange?: (images: PendingImage[]) => void;
  pendingImages?: PendingImage[];
  disabled?: boolean;
};

export function ProductMultiImageUpload({
  productId,
  organizationId,
  currentImageUrls = [],
  currentStorageIds = [],
  onImagesChange,
  pendingImages = [],
  disabled = false,
}: ProductMultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProductImages = useMutation(api.files.saveProductImages);
  const removeProductImage = useMutation(api.files.removeProductImage);

  // In edit mode, use server data; in create mode, use pending images
  const displayImages = productId
    ? currentImageUrls.map((url, i) => ({
        url,
        storageId: currentStorageIds[i],
      }))
    : pendingImages.map((img) => ({
        url: img.previewUrl,
        storageId: img.storageId,
      }));

  const totalImages = displayImages.length;
  const canAddMore = totalImages < MAX_IMAGES;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Limit how many we can add
    const slotsAvailable = MAX_IMAGES - totalImages;
    const filesToUpload = files.slice(0, slotsAvailable);

    if (files.length > slotsAvailable) {
      toast.warning(
        `Only ${slotsAvailable} more image${slotsAvailable === 1 ? "" : "s"} can be added`,
      );
    }

    // Validate all files
    for (const file of filesToUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(
          `${file.name}: Only JPEG, PNG, and WebP images are allowed`,
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File size must be less than 2MB`);
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploadedImages: PendingImage[] = [];

      for (const file of filesToUpload) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
        const { storageId } = await response.json();

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        uploadedImages.push({ storageId, previewUrl });
      }

      if (productId) {
        // Existing product — save to DB immediately
        await saveProductImages({
          organizationId,
          productId,
          storageIds: uploadedImages.map((img) => img.storageId),
          fileNames: filesToUpload.map((f) => f.name),
          fileTypes: filesToUpload.map((f) => f.type),
          fileSizes: filesToUpload.map((f) => f.size),
        });
        toast.success(
          `${uploadedImages.length} image${uploadedImages.length === 1 ? "" : "s"} uploaded`,
        );
      } else {
        // New product — pass to parent
        onImagesChange?.([...pendingImages, ...uploadedImages]);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload images",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    if (productId) {
      const storageId = currentStorageIds[index];
      if (!storageId) return;
      setRemovingIndex(index);
      try {
        await removeProductImage({ organizationId, productId, storageId });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove image",
        );
      } finally {
        setRemovingIndex(null);
      }
    } else {
      const updated = pendingImages.filter((_, i) => i !== index);
      onImagesChange?.(updated);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {/* Existing images */}
        {displayImages.map((img, index) => (
          <div
            key={img.storageId ?? index}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
          >
            <Image
              src={img.url}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 200px"
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled || removingIndex === index}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 disabled:opacity-50"
              aria-label={`Remove image ${index + 1}`}
            >
              {removingIndex === index ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
            </button>
          </div>
        ))}

        {/* Add more slot */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs">Uploading...</span>
              </>
            ) : totalImages === 0 ? (
              <>
                <ImagePlus className="size-6" />
                <span className="text-xs">Upload Images</span>
              </>
            ) : (
              <>
                <Plus className="size-6" />
                <span className="text-xs">Add More</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Up to {MAX_IMAGES} images. Max 2MB each. JPEG, PNG, or WebP.
      </p>
    </div>
  );
}
