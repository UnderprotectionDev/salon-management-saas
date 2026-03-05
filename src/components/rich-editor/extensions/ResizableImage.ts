import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "../node-views/ImageNodeView";

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("width") || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.width ? { width: attrs.width } : {},
      },
      alignment: {
        default: "center",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-alignment") || "center",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-alignment": attrs.alignment,
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
