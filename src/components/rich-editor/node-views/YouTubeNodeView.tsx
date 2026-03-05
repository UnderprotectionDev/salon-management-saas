import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function getEmbedUrl(src: string): string | null {
  if (!src) return null;

  // Already an embed URL — validate it's actually YouTube
  if (src.includes("/embed/")) {
    if (
      src.startsWith("https://www.youtube.com/embed/") ||
      src.startsWith("https://www.youtube-nocookie.com/embed/")
    ) {
      return src;
    }
    // Not a YouTube domain, fall through to extract video ID
  }

  let videoId: string | null = null;

  // youtu.be/VIDEO_ID
  const shortMatch = src.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // youtube.com/watch?v=VIDEO_ID
  if (!videoId) {
    const watchMatch = src.match(/[?&]v=([\w-]+)/);
    if (watchMatch) videoId = watchMatch[1];
  }

  // youtube.com/shorts/VIDEO_ID
  if (!videoId) {
    const shortsMatch = src.match(/\/shorts\/([\w-]+)/);
    if (shortsMatch) videoId = shortsMatch[1];
  }

  if (!videoId) return null;

  const domain = src.includes("nocookie")
    ? "www.youtube-nocookie.com"
    : "www.youtube.com";

  return `https://${domain}/embed/${videoId}`;
}

export function YouTubeNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const { src } = node.attrs;
  const embedUrl = getEmbedUrl(src);

  return (
    <NodeViewWrapper
      className="rich-editor-youtube-wrapper"
      data-alignment="fit"
    >
      <div className="rich-editor-youtube-container" data-selected={selected}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`YouTube video: ${src || "embedded"}`}
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: "16/9",
              pointerEvents: selected ? "auto" : "none",
            }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              background: "var(--muted)",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted-foreground)",
              fontSize: "0.875rem",
            }}
          >
            Invalid YouTube URL
          </div>
        )}

        {/* Delete button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="rich-editor-youtube-delete size-7"
          onClick={deleteNode}
          aria-label="Delete video"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </NodeViewWrapper>
  );
}
