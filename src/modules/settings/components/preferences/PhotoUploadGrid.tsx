"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUploadGrid({
  photos,
  onPhotosChange,
  maxPhotos = 3,
}: {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const fileUrls = useQuery(
    api.files.getFileUrls,
    photos.length > 0 ? { storageIds: photos as Id<"_storage">[] } : "skip",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 2MB");
      return;
    }
    if (photos.length >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      onPhotosChange([...photos, storageId]);
    } catch {
      toast.error("Failed to upload photo");
    }
  };

  const handleRemove = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const slots = Array.from({ length: maxPhotos });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Photos</Label>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos}
        </span>
      </div>
      <div className="flex gap-3">
        {slots.map((_, i) => {
          const photoId = photos[i];
          const url = fileUrls?.[i];

          if (photoId) {
            return (
              <div
                key={photoId}
                className="relative size-20 rounded-lg border overflow-hidden bg-muted"
              >
                {url ? (
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full animate-pulse bg-muted" />
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          }

          if (i === photos.length) {
            return (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 transition-colors hover:border-primary/50 hover:text-primary/50"
                aria-label="Add photo"
              >
                <Plus className="size-5" />
              </button>
            );
          }

          return (
            <div
              key={`placeholder-${i}`}
              className="size-20 rounded-lg border-2 border-dashed border-muted-foreground/15"
            />
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
