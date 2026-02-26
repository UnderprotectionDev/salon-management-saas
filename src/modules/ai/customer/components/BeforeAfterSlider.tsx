"use client";

import { GripVertical } from "lucide-react";
import { useRef, useState } from "react";

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  function getPositionFromEvent(clientX: number): number {
    const container = containerRef.current;
    if (!container) return 50;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  function handlePointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    setSliderPosition(getPositionFromEvent(e.clientX));
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    setSliderPosition(getPositionFromEvent(e.clientX));
  }

  function handlePointerUp() {
    isDragging.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full cursor-col-resize select-none overflow-hidden rounded-md border"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Before (original) — full width background */}
      {/* biome-ignore lint/performance/noImgElement: dynamic storage URL */}
      <img
        src={beforeUrl}
        alt="Original appearance"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* After (result) — clipped to the right of the slider handle */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        {/* biome-ignore lint/performance/noImgElement: dynamic storage URL */}
        <img
          src={afterUrl}
          alt="Try-on result"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-md"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/50 shadow-lg">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 z-10 rounded bg-black/50 px-2 py-0.5 text-white text-xs">
        Before
      </div>
      <div className="absolute top-2 right-2 z-10 rounded bg-black/50 px-2 py-0.5 text-white text-xs">
        After
      </div>
    </div>
  );
}
