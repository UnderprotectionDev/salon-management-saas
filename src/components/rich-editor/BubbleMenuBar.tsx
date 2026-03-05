import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Baseline,
  Bold,
  ChevronDown,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Italic,
  Link,
  Pilcrow,
  Underline,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BubbleMenuBarProps {
  editor: Editor;
}

const HEADINGS = [
  { label: "Paragraph", icon: Pilcrow, level: 0 },
  { label: "Heading 1", icon: Heading1, level: 1 },
  { label: "Heading 2", icon: Heading2, level: 2 },
  { label: "Heading 3", icon: Heading3, level: 3 },
  { label: "Heading 4", icon: Heading4, level: 4 },
] as const;

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#000000" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red 700", value: "#b91c1c" },
  { label: "Orange 700", value: "#c2410c" },
  { label: "Green 700", value: "#15803d" },
  { label: "Blue 700", value: "#1d4ed8" },
  { label: "Purple 700", value: "#7e22ce" },
  { label: "Pink 700", value: "#be185d" },
  { label: "Red 500", value: "#ef4444" },
  { label: "Orange 500", value: "#f97316" },
  { label: "Green 500", value: "#22c55e" },
  { label: "Blue 500", value: "#3b82f6" },
  { label: "Purple 500", value: "#a855f7" },
  { label: "Pink 500", value: "#ec4899" },
];

const HIGHLIGHTS = [
  { label: "Default", value: "" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#f3e8ff" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Red", value: "#fee2e2" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Gray", value: "#f3f4f6" },
];

export function BubbleMenuBar({ editor }: BubbleMenuBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [headingOpen, setHeadingOpen] = useState(false);
  const activeHeading = HEADINGS.find(
    (h) => h.level > 0 && editor.isActive("heading", { level: h.level }),
  );
  const HeadingIcon = activeHeading?.icon ?? Heading;
  const currentColor = editor.getAttributes("textStyle").color ?? "";

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state }) => {
        const { from, to } = state.selection;
        if (from === to) return false;
        // Hide for node selections (images, youtube etc.)
        if (e.isActive("image") || e.isActive("youtube")) return false;
        return true;
      }}
    >
      <TooltipProvider delayDuration={300}>
        <div
          ref={containerRef}
          className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md"
        >
          {/* Heading dropdown — inline panel (no Radix Portal) */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-0 px-1"
                  onClick={() => setHeadingOpen((o) => !o)}
                  onBlur={() => setHeadingOpen(false)}
                >
                  <HeadingIcon className="size-3.5" />
                  <ChevronDown className="size-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Heading</TooltipContent>
            </Tooltip>
            {headingOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md"
                onMouseDown={(e) => e.preventDefault()}
              >
                {HEADINGS.map((heading) => {
                  const Icon = heading.icon;
                  return (
                    <button
                      key={heading.level}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        if (heading.level === 0) {
                          editor.chain().focus().setParagraph().run();
                        } else {
                          editor
                            .chain()
                            .focus()
                            .toggleHeading({
                              level: heading.level as 1 | 2 | 3 | 4,
                            })
                            .run();
                        }
                        setHeadingOpen(false);
                      }}
                    >
                      <Icon className="size-4" />
                      {heading.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mx-0.5 h-4 w-px bg-border" />

          {/* Bold */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={editor.isActive("bold")}
                onPressedChange={() =>
                  editor.chain().focus().toggleBold().run()
                }
                aria-label="Bold"
              >
                <Bold className="size-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Bold</TooltipContent>
          </Tooltip>

          {/* Italic */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={editor.isActive("italic")}
                onPressedChange={() =>
                  editor.chain().focus().toggleItalic().run()
                }
                aria-label="Italic"
              >
                <Italic className="size-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Italic</TooltipContent>
          </Tooltip>

          {/* Underline */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={editor.isActive("underline")}
                onPressedChange={() =>
                  editor.chain().focus().toggleUnderline().run()
                }
                aria-label="Underline"
              >
                <Underline className="size-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Underline</TooltipContent>
          </Tooltip>

          {/* Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                className="size-7 p-0"
                pressed={editor.isActive("link")}
                onPressedChange={() => {
                  if (editor.isActive("link")) {
                    editor.chain().focus().unsetLink().run();
                    return;
                  }
                  const url = window.prompt("Enter URL:");
                  if (url && /^https?:\/\//i.test(url.trim())) {
                    editor
                      .chain()
                      .focus()
                      .setLink({
                        href: url.trim(),
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })
                      .run();
                  }
                }}
                aria-label="Link"
              >
                <Link className="size-3.5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Link</TooltipContent>
          </Tooltip>

          <div className="mx-0.5 h-4 w-px bg-border" />

          {/* Highlight */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 relative"
                  >
                    <Highlighter className="size-3.5" />
                    {editor.isActive("highlight") && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            (editor.getAttributes("highlight")
                              .color as string) || "#fef08a",
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Highlight</TooltipContent>
            </Tooltip>
            <PopoverContent
              className="w-auto p-2"
              align="start"
              container={containerRef.current}
            >
              <div className="grid grid-cols-9 gap-1">
                {HIGHLIGHTS.map((color) => (
                  <button
                    key={color.label}
                    type="button"
                    className="size-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: color.value || "transparent",
                    }}
                    title={color.label}
                    aria-label={color.label}
                    onClick={() => {
                      if (color.value) {
                        editor
                          .chain()
                          .focus()
                          .toggleHighlight({ color: color.value })
                          .run();
                      } else {
                        editor.chain().focus().unsetHighlight().run();
                      }
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Text Color */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 relative"
                  >
                    <Baseline className="size-3.5" />
                    {currentColor && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full"
                        style={{ backgroundColor: currentColor }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Text Color</TooltipContent>
            </Tooltip>
            <PopoverContent
              className="w-auto p-2"
              align="start"
              container={containerRef.current}
            >
              <div className="grid grid-cols-8 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.label}
                    type="button"
                    className="size-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: color.value || "var(--foreground)",
                    }}
                    title={color.label}
                    aria-label={color.label}
                    onClick={() => {
                      if (color.value) {
                        editor.chain().focus().setColor(color.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>
    </BubbleMenu>
  );
}
