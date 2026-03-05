import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Trash2,
  Ungroup,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

const RATIO_PRESETS = [25, 50, 75] as const;

function getGridColumns(ratio: number): string {
  if (ratio === 25) return "1fr 3fr";
  if (ratio === 75) return "3fr 1fr";
  return "1fr 1fr";
}

export function ImageWithTextNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const { src, alt, imagePosition, ratio } = node.attrs;

  const isRight = imagePosition === "right";
  const gridColumns = getGridColumns(ratio);

  function unwrapToImage() {
    const pos = getPos();
    if (pos == null || !editor) return;

    const textContent = node.content.toJSON();
    const isEmpty = textContent.length === 1 && !textContent[0].content?.length;

    const replacement = [
      {
        type: "image",
        attrs: { src, alt, alignment: "center", width: null },
      },
      ...(isEmpty ? [] : textContent),
    ];

    editor
      .chain()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .insertContentAt(pos, replacement)
      .run();
  }

  return (
    <NodeViewWrapper className="image-with-text-wrapper">
      <div
        className="image-with-text-grid"
        style={{ gridTemplateColumns: gridColumns }}
      >
        <div
          className="image-with-text-image-col"
          style={{ order: isRight ? 2 : 1 }}
        >
          <img src={src} alt={alt || ""} draggable={false} />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="image-with-text-delete size-7"
            onClick={deleteNode}
            aria-label="Delete image"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <NodeViewContent
          className="image-with-text-text-col"
          style={{ order: isRight ? 1 : 2 }}
        />
      </div>

      {selected && (
        <div className="image-with-text-toolbar">
          {/* Row 1: Alignment */}
          <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md">
            <Toggle
              size="sm"
              className="size-7 p-0"
              pressed={imagePosition === "left"}
              onPressedChange={() =>
                updateAttributes({ imagePosition: "left" })
              }
              aria-label="Image left"
            >
              <AlignLeft className="size-3.5" />
            </Toggle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={unwrapToImage}
              aria-label="Center (unwrap)"
            >
              <AlignCenter className="size-3.5" />
            </Button>
            <Toggle
              size="sm"
              className="size-7 p-0"
              pressed={imagePosition === "right"}
              onPressedChange={() =>
                updateAttributes({ imagePosition: "right" })
              }
              aria-label="Image right"
            >
              <AlignRight className="size-3.5" />
            </Toggle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={unwrapToImage}
              aria-label="Fit (unwrap)"
            >
              <Maximize2 className="size-3.5" />
            </Button>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={unwrapToImage}
              aria-label="Unwrap columns"
              title="Unwrap columns"
            >
              <Ungroup className="size-3.5" />
            </Button>
          </div>

          {/* Row 2: Ratio presets */}
          <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md">
            {RATIO_PRESETS.map((preset) => (
              <Toggle
                key={preset}
                size="sm"
                className="h-7 px-2 text-xs"
                pressed={ratio === preset}
                onPressedChange={() => updateAttributes({ ratio: preset })}
                aria-label={`${preset}% image width`}
              >
                {preset}%
              </Toggle>
            ))}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
