"use client";

import { useEffect, useRef } from "react";
import type { Area } from "react-easy-crop";
import { drawCropPreview } from "./cropUtils";

export function CropPreview({
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
