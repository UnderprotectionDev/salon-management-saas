import type { Area } from "react-easy-crop";

// =============================================================================
// Canvas crop utility
// =============================================================================

export async function getCroppedBlob(
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

export function drawCropPreview(
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
