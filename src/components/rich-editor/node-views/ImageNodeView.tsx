import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

const MIN_WIDTH = 100;
const SIZE_PRESETS = [25, 50, 75, 100] as const;

export function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const { src, alt, width, alignment } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const aspectRatioRef = useRef<number>(1);
  const finalWidthRef = useRef<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const isFit = alignment === "fit";

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      aspectRatioRef.current = img.naturalWidth / img.naturalHeight;
    }
  }

  function startResize(e: React.MouseEvent, corner: string) {
    if (isFit) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const imgEl = containerRef.current?.querySelector("img");
    if (!imgEl) return;

    const startWidth = imgEl.getBoundingClientRect().width;
    const isLeft = corner.includes("left");

    setIsResizing(true);

    function onMouseMove(ev: MouseEvent) {
      const deltaX = ev.clientX - startX;
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.round(startWidth + (isLeft ? -deltaX : deltaX)),
      );

      // Clamp to container width
      const maxWidth = containerRef.current?.parentElement?.clientWidth;
      const clamped = maxWidth ? Math.min(newWidth, maxWidth) : newWidth;
      finalWidthRef.current = clamped;
      setResizeWidth(clamped);
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      cleanupRef.current = null;
      const committedWidth = finalWidthRef.current;
      setIsResizing(false);
      setResizeWidth(null);
      finalWidthRef.current = null;
      if (committedWidth !== null) {
        requestAnimationFrame(() => {
          updateAttributes({ width: committedWidth });
        });
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    cleanupRef.current = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  function wrapWithText(position: "left" | "right") {
    const pos = getPos();
    if (pos == null || !editor) return;

    editor
      .chain()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .insertContentAt(pos, {
        type: "imageWithText",
        attrs: { src, alt, imagePosition: position, ratio: 50 },
        content: [{ type: "paragraph" }],
      })
      .focus(pos + 2)
      .run();
  }

  function applyPreset(pct: number) {
    const editorEl = containerRef.current?.closest(".rich-editor-content");
    if (!editorEl) return;
    const containerWidth = editorEl.clientWidth;
    const newWidth = Math.round((containerWidth * pct) / 100);
    updateAttributes({ width: newWidth });
  }

  const displayWidth = isResizing && resizeWidth !== null ? resizeWidth : width;
  const imgStyle: React.CSSProperties = displayWidth
    ? { width: `${displayWidth}px`, height: "auto" }
    : {};

  return (
    <NodeViewWrapper
      className="rich-editor-image-wrapper"
      data-alignment={alignment || "center"}
    >
      <div
        ref={containerRef}
        className="rich-editor-image-container"
        data-selected={selected}
      >
        {src ? (
          <img
            src={src}
            alt={alt || ""}
            style={imgStyle}
            className="rich-editor-image"
            onLoad={handleImageLoad}
            draggable={false}
          />
        ) : (
          <div
            className="rich-editor-image flex items-center justify-center bg-muted text-muted-foreground text-sm"
            style={imgStyle}
          >
            No image source
          </div>
        )}

        {/* Delete button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="rich-editor-image-delete size-7"
          onClick={deleteNode}
          aria-label="Delete image"
        >
          <Trash2 className="size-3.5" />
        </Button>

        {/* Resize handles — hidden in fit mode */}
        {!isFit &&
          (
            ["top-left", "top-right", "bottom-left", "bottom-right"] as const
          ).map((corner) => (
            <div
              key={corner}
              className={`rich-editor-resize-handle ${corner}`}
              onMouseDown={(e) => startResize(e, corner)}
            />
          ))}

        {/* Alignment bar + size presets */}
        {selected && (
          <div className="rich-editor-image-alignment">
            {/* Row 1: Alignment */}
            <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md">
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={false}
                onPressedChange={() => wrapWithText("left")}
                aria-label="Left columns"
              >
                <AlignLeft className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={alignment === "center" || !alignment}
                onPressedChange={() =>
                  updateAttributes({ alignment: "center" })
                }
                aria-label="Align center"
              >
                <AlignCenter className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={false}
                onPressedChange={() => wrapWithText("right")}
                aria-label="Right columns"
              >
                <AlignRight className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={isFit}
                onPressedChange={() =>
                  updateAttributes({ alignment: "fit", width: null })
                }
                aria-label="Fit to width"
              >
                <Maximize2 className="size-3.5" />
              </Toggle>
            </div>

            {/* Row 2: Size presets — hidden in fit mode */}
            {!isFit && (
              <div className="mt-0.5 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md">
                {SIZE_PRESETS.map((pct) => (
                  <Toggle
                    key={pct}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    pressed={false}
                    onPressedChange={() => applyPreset(pct)}
                    aria-label={`${pct}% width`}
                  >
                    {pct}%
                  </Toggle>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
