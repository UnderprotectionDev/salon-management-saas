import Youtube from "@tiptap/extension-youtube";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { YouTubeNodeView } from "../node-views/YouTubeNodeView";

export const ResizableYouTube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Remove parent's width/height defaults — CSS aspect-ratio handles sizing
      width: { default: null, renderHTML: () => ({}) },
      height: { default: null, renderHTML: () => ({}) },
      alignment: {
        default: "fit",
        parseHTML: (el: HTMLElement) => {
          const parent = el.closest("div[data-youtube-video]");
          return parent?.getAttribute("data-alignment") || "fit";
        },
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-alignment": attrs.alignment,
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const alignment = HTMLAttributes["data-alignment"] || "fit";
    const { "data-alignment": _, ...iframeAttrs } = HTMLAttributes;

    // Call parent to get the embed URL processing
    const parentResult = this.parent?.({ node, HTMLAttributes: iframeAttrs });
    if (Array.isArray(parentResult)) {
      // Parent returns ["div", { "data-youtube-video": "" }, ["iframe", ...]]
      // Inject data-alignment onto the wrapper div
      const [tag, divAttrs, ...rest] = parentResult;
      return [
        tag,
        { ...(divAttrs as object), "data-alignment": alignment },
        ...rest,
      ];
    }
    if (!parentResult) {
      return ["div", { "data-youtube-video": "", "data-alignment": alignment }];
    }
    return parentResult as readonly [
      string,
      Record<string, unknown>,
      ...unknown[],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeNodeView);
  },
});
