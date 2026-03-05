import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageWithTextNodeView } from "../node-views/ImageWithTextNodeView";

function isSafeImageSrc(src: string | null): boolean {
  if (!src) return false;
  try {
    const url = new URL(src, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const ImageWithText = Node.create({
  name: "imageWithText",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      imagePosition: { default: "left" },
      ratio: { default: 50 },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-image-with-text]",
        getAttrs(el) {
          const element = el as HTMLElement;
          const img = element.querySelector("img");
          return {
            src: img?.getAttribute("src") || null,
            alt: img?.getAttribute("alt") || "",
            imagePosition:
              element.getAttribute("data-image-position") || "left",
            ratio: Number(element.getAttribute("data-ratio")) || 50,
          };
        },
        contentElement: "div[data-text-column]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, imagePosition, ratio, ...rest } = HTMLAttributes;

    const ratioMap: Record<number, string> = {
      25: "1fr 3fr",
      50: "1fr 1fr",
      75: "3fr 1fr",
    };
    const columns = ratioMap[Number(ratio)] || "1fr 1fr";
    const imageOrder = imagePosition === "right" ? 2 : 1;
    const textOrder = imagePosition === "right" ? 1 : 2;

    return [
      "div",
      mergeAttributes(rest, {
        "data-image-with-text": "",
        "data-image-position": imagePosition,
        "data-ratio": ratio,
        style: `display:grid;grid-template-columns:${columns};gap:1em;align-items:start;`,
      }),
      [
        "img",
        {
          src: isSafeImageSrc(src) ? src : "",
          alt: alt || "",
          style: `width:100%;height:auto;border-radius:var(--radius);display:block;order:${imageOrder};`,
        },
      ],
      [
        "div",
        {
          "data-text-column": "",
          style: `order:${textOrder};`,
        },
        0,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageWithTextNodeView);
  },
});
