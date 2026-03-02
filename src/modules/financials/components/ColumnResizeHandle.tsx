"use client";

import { useRef } from "react";
import { GRID } from "../lib/spreadsheet-types";

interface ColumnResizeHandleProps {
  col: number;
  currentWidth: number;
  onResize: (col: number, width: number) => void;
}

export function ColumnResizeHandle({
  col,
  currentWidth,
  onResize,
}: ColumnResizeHandleProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;

    function handleMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startXRef.current;
      const newWidth = Math.max(
        GRID.MIN_COL_WIDTH,
        startWidthRef.current + delta,
      );
      onResize(col, newWidth);
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: resize handle needs mouse interaction
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        width: 4,
        height: "100%",
        cursor: "col-resize",
        zIndex: 5,
      }}
    />
  );
}
