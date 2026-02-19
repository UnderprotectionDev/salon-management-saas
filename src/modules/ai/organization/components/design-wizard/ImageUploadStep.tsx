"use client";

import { ImagePlus, RotateCcw, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryVisual } from "./category-presets";

// =============================================================================
// Canvas crop utility
// =============================================================================

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

// =============================================================================
// Live Crop Preview (canvas-based, updates on every crop change)
// =============================================================================

function drawCropPreview(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  pixels: Area | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = 240;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  if (pixels && pixels.width > 0 && pixels.height > 0) {
    ctx.drawImage(
      img,
      pixels.x,
      pixels.y,
      pixels.width,
      pixels.height,
      0,
      0,
      size,
      size,
    );
  } else {
    const scale = Math.min(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  }
}

function CropPreview({
  imageSrc,
  croppedAreaPixels,
}: {
  imageSrc: string;
  croppedAreaPixels: Area | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pixelsRef = useRef<Area | null>(croppedAreaPixels);
  pixelsRef.current = croppedAreaPixels;

  // Load image once when imageSrc changes
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      if (canvasRef.current) {
        drawCropPreview(canvasRef.current, img, pixelsRef.current);
      }
    };
    img.src = imageSrc;

    return () => {
      imageRef.current = null;
    };
  }, [imageSrc]);

  // Redraw whenever crop area changes
  useEffect(() => {
    if (imageRef.current && canvasRef.current) {
      drawCropPreview(canvasRef.current, imageRef.current, croppedAreaPixels);
    }
  }, [croppedAreaPixels]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-md object-contain"
      style={{ imageRendering: "auto" }}
    />
  );
}

// =============================================================================
// Image Upload Step
// =============================================================================

interface ImageUploadStepProps {
  category: string;
  imageFile: File | null;
  imagePreview: string | null;
  onImageChange: (file: File, preview: string) => void;
  onClearImage: () => void;
  onCategoryChange: () => void;
}

export function ImageUploadStep({
  category,
  imageFile,
  imagePreview,
  onImageChange,
  onClearImage,
  onCategoryChange,
}: ImageUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raw image for cropping (before crop is applied)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Zoom input for keyboard editing
  const [zoomInput, setZoomInput] = useState("100");
  const [isZoomFocused, setIsZoomFocused] = useState(false);

  if (!isZoomFocused && String(Math.round(zoom * 100)) !== zoomInput) {
    setZoomInput(String(Math.round(zoom * 100)));
  }

  const categoryVisual = getCategoryVisual(category);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const rawUrl = URL.createObjectURL(file);
    setRawImageSrc(rawUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropping(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const rawUrl = URL.createObjectURL(file);
    setRawImageSrc(rawUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropping(true);
  }

  function handleCropComplete(_: Area, pixels: Area) {
    setCroppedAreaPixels(pixels);
  }

  async function applyCrop() {
    if (!rawImageSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(rawImageSrc, croppedAreaPixels);
      const croppedFile = new File([blob], "design.jpg", {
        type: "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(blob);
      onImageChange(croppedFile, previewUrl);
      setIsCropping(false);
      URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
    } catch {
      toast.error("Failed to crop image");
    }
  }

  function resetCrop() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  function cancelCrop() {
    setIsCropping(false);
    if (rawImageSrc) {
      URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
    }
  }

  function applyZoomInput(raw: string) {
    const pct = Number.parseInt(raw, 10);
    if (!Number.isNaN(pct)) {
      const clamped = Math.min(400, Math.max(50, pct));
      setZoom(clamped / 100);
      setZoomInput(String(clamped));
    } else {
      setZoomInput(String(Math.round(zoom * 100)));
    }
  }

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  // ---- Cropping mode ----
  if (isCropping && rawImageSrc) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        {fileInput}

        <div className="mb-6 flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            {(() => {
              const Icon = categoryVisual.icon;
              return <Icon className="h-3 w-3" />;
            })()}
            {category}
          </Badge>
          <button
            type="button"
            onClick={onCategoryChange}
            className="text-muted-foreground text-xs underline hover:text-foreground"
          >
            Change
          </button>
        </div>

        <h2 className="mb-1 font-semibold text-xl">Crop Your Image</h2>
        <p className="mb-6 text-muted-foreground text-sm">
          Position the image within the square frame. This is what customers
          will see.
        </p>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Crop area */}
          <div>
            <div className="relative h-[400px] w-full overflow-hidden rounded-lg border bg-neutral-900 lg:h-[460px]">
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                objectFit="cover"
                minZoom={0.5}
                maxZoom={4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                showGrid={true}
                style={{
                  containerStyle: { borderRadius: "0.5rem" },
                }}
              />
            </div>

            {/* Zoom slider */}
            <div className="mt-4 flex items-center gap-3">
              <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-foreground"
                aria-label="Zoom"
              />
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex shrink-0 items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={zoomInput}
                  onChange={(e) =>
                    setZoomInput(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  onFocus={(e) => {
                    setIsZoomFocused(true);
                    e.target.select();
                  }}
                  onBlur={() => {
                    setIsZoomFocused(false);
                    applyZoomInput(zoomInput);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const next = Math.min(400, Math.round(zoom * 100) + 5);
                      setZoom(next / 100);
                      setZoomInput(String(next));
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const next = Math.max(50, Math.round(zoom * 100) - 5);
                      setZoom(next / 100);
                      setZoomInput(String(next));
                    }
                  }}
                  className="w-14 rounded-md border border-input bg-background px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label="Zoom percentage"
                />
                <span className="ml-1 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Right panel: controls */}
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="mb-3 font-medium text-sm">Preview</h3>
              <div className="aspect-square w-full overflow-hidden rounded-md border bg-muted">
                <CropPreview
                  imageSrc={rawImageSrc}
                  croppedAreaPixels={croppedAreaPixels}
                />
              </div>
              <p className="mt-2 text-center text-muted-foreground text-xs">
                Crop result preview
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={resetCrop}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Crop
            </Button>

            <div className="mt-auto flex gap-2">
              <Button variant="outline" className="flex-1" onClick={cancelCrop}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={applyCrop}>
                Use This Area
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Upload mode (no image yet or image already cropped) ----
  return (
    <div className="mx-auto w-full max-w-4xl">
      {fileInput}

      <div className="mb-6 flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          {(() => {
            const Icon = categoryVisual.icon;
            return <Icon className="h-3 w-3" />;
          })()}
          {category}
        </Badge>
        <button
          type="button"
          onClick={onCategoryChange}
          className="text-muted-foreground text-xs underline hover:text-foreground"
        >
          Change
        </button>
      </div>

      <h2 className="mb-1 font-semibold text-xl">Upload Design Image</h2>
      <p className="mb-6 text-muted-foreground text-sm">
        Upload a high-quality photo of the design. It will be cropped to a
        square.
      </p>

      {imagePreview && imageFile ? (
        /* Image already cropped - show result */
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="relative overflow-hidden rounded-lg border">
            {/* biome-ignore lint/performance/noImgElement: blob URL preview */}
            <img
              src={imagePreview}
              alt="Cropped design preview"
              className="aspect-square w-full object-cover"
            />
            <button
              type="button"
              onClick={onClearImage}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="mb-2 font-medium text-sm">Image ready</h3>
              <p className="text-muted-foreground text-xs">
                Your image has been cropped and is ready. You can re-crop or
                upload a different image.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Different Image
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Re-enter crop mode with the current preview
                if (imagePreview) {
                  setRawImageSrc(imagePreview);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setIsCropping(true);
                }
              }}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-crop Image
            </Button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-full cursor-pointer text-left"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border py-20 transition-colors hover:border-foreground/30 hover:bg-muted/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">
                Drag & drop or click to upload
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                JPEG, PNG or WebP &middot; max 5MB
              </p>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
