"use client";

import DOMPurify from "dompurify";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  html?: string | null;
  emptyFallback?: ReactNode;
  className?: string;
}

const ALLOWED_TAGS = [
  "p",
  "strong",
  "em",
  "s",
  "u",
  "ul",
  "ol",
  "li",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
  "span",
  "mark",
  "blockquote",
  "hr",
  "label",
  "input",
  "div",
  "iframe",
];
const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "style",
  "class",
  "data-type",
  "data-checked",
  "data-alignment",
  "data-youtube-video",
  "data-clear-float",
  "data-image-with-text",
  "data-image-position",
  "data-ratio",
  "data-text-column",
  "type",
  "checked",
  "allowfullscreen",
  "frameborder",
  "allow",
];

const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
];

// Dangerous CSS patterns that could be used for exfiltration or UI manipulation
const DANGEROUS_CSS_RE = /url\s*\(|expression\s*\(|import\s|behavior\s*:/i;

function setupDOMPurifyHooks() {
  // Clear any existing hooks to prevent duplication on HMR
  DOMPurify.removeAllHooks();

  // Restrict iframe src to YouTube domains only
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "iframe") {
      const src = node.getAttribute("src") || "";
      try {
        const url = new URL(src);
        if (!ALLOWED_IFRAME_HOSTS.includes(url.hostname)) {
          node.remove();
        }
      } catch {
        node.remove();
      }
    }
    // Restrict input to checkbox only (for task lists)
    if (data.tagName === "input") {
      const type = node.getAttribute("type");
      if (type !== "checkbox") {
        node.remove();
      }
    }
  });

  // Strip dangerous CSS from style attributes
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "style" && DANGEROUS_CSS_RE.test(data.attrValue)) {
      data.attrValue = data.attrValue
        .split(";")
        .filter((rule) => !DANGEROUS_CSS_RE.test(rule))
        .join(";");
    }
  });
}

let hooksInitialized = false;

function sanitizeHtml(html: string): string {
  if (!hooksInitialized) {
    setupDOMPurifyHooks();
    hooksInitialized = true;
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function RichTextDisplay({
  html,
  emptyFallback,
  className,
}: RichTextDisplayProps) {
  if (!html) {
    return <>{emptyFallback ?? null}</>;
  }

  const clean = sanitizeHtml(html);

  return (
    <div
      className={cn("rich-text-display", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by DOMPurify
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
