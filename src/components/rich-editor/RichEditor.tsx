"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { TaskItem } from "@tiptap/extension-list/task-item";
import { TaskList } from "@tiptap/extension-list/task-list";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Eye,
  Italic,
  List,
  ListOrdered,
  Minus,
  PenLine,
  TextQuote,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BubbleMenuBar } from "./BubbleMenuBar";
import { RichTextDisplay } from "./RichTextDisplay";
import { ClearFloat } from "./extensions/ClearFloat";
import { ImageWithText } from "./extensions/ImageWithText";
import { ResizableImage } from "./extensions/ResizableImage";
import { ResizableYouTube } from "./extensions/ResizableYouTube";
import { AlignmentToolbar } from "./toolbars/AlignmentToolbar";
import { ColorToolbar } from "./toolbars/ColorToolbar";
import { HeadingToolbar } from "./toolbars/HeadingToolbar";
import { HighlightToolbar } from "./toolbars/HighlightToolbar";
import { ImageUploadToolbar } from "./toolbars/ImageUploadToolbar";
import { LinkToolbar } from "./toolbars/LinkToolbar";
import { TaskListToolbar } from "./toolbars/TaskListToolbar";
import { UnderlineToolbar } from "./toolbars/UnderlineToolbar";
import { YouTubeToolbar } from "./toolbars/YouTubeToolbar";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  limit?: number;
}

function normalizeEmpty(html: string): string {
  if (!html || html === "<p></p>") return "";
  return html;
}

export function RichEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  className,
  limit,
}: RichEditorProps) {
  const [preview, setPreview] = useState(false);
  const [charCount, setCharCount] = useState({ characters: 0, words: 0 });
  const lastEmittedHtml = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        dropcursor: { color: "var(--ring)", width: 2 },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      ResizableImage.configure({
        HTMLAttributes: {
          class: "rich-editor-image",
        },
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing...",
      }),
      CharacterCount.configure({ limit: limit ?? undefined }),
      Typography,
      ResizableYouTube.configure({ controls: true, nocookie: true }),
      ClearFloat,
      ImageWithText,
    ],
    content: value || "",
    editable: !disabled,
    onCreate: ({ editor: e }) => {
      setCharCount({
        characters: e.storage.characterCount.characters(),
        words: e.storage.characterCount.words(),
      });
    },
    onUpdate: ({ editor: e }) => {
      const html = normalizeEmpty(e.getHTML());
      lastEmittedHtml.current = html;
      onChange(html);
      setCharCount({
        characters: e.storage.characterCount.characters(),
        words: e.storage.characterCount.words(),
      });
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content",
      },
    },
  });

  // Sync content only when value changes externally (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    // Skip if this value is what we last emitted — it came from the editor itself
    if (value === lastEmittedHtml.current) return;
    lastEmittedHtml.current = value;
    editor.commands.setContent(value || "", false);
    setCharCount({
      characters: editor.storage.characterCount.characters(),
      words: editor.storage.characterCount.words(),
    });
  }, [editor, value]);

  // Sync editable state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "rounded-md border border-input bg-background",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
          {/* Preview toggle */}
          <Button
            type="button"
            variant={preview ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs font-medium"
            onClick={() => setPreview((p) => !p)}
            aria-label={preview ? "Back to editor" : "Preview"}
          >
            {preview ? (
              <>
                <PenLine className="size-3.5" />
                Edit
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                Preview
              </>
            )}
          </Button>

          <Separator orientation="vertical" className="mx-0.5 !h-6" />

          <div
            className={cn(
              "flex flex-wrap items-center gap-0.5",
              preview && "pointer-events-none opacity-40",
            )}
            {...(preview ? { inert: true } : {})}
          >
            {/* Heading Dropdown */}
            <HeadingToolbar editor={editor} />

            <Separator orientation="vertical" className="mx-0.5 !h-6" />

            {/* Inline Formatting: Bold, Italic, Strikethrough, Underline, Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive("bold")}
                  onPressedChange={() =>
                    editor.chain().focus().toggleBold().run()
                  }
                  disabled={!editor.can().toggleBold()}
                  aria-label="Bold"
                >
                  <Bold className="size-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive("italic")}
                  onPressedChange={() =>
                    editor.chain().focus().toggleItalic().run()
                  }
                  disabled={!editor.can().toggleItalic()}
                  aria-label="Italic"
                >
                  <Italic className="size-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>

            <UnderlineToolbar editor={editor} />

            <LinkToolbar editor={editor} />

            <Separator orientation="vertical" className="mx-0.5 !h-6" />

            {/* Color: Highlight, Text Color */}
            <HighlightToolbar editor={editor} />

            <ColorToolbar editor={editor} />

            <Separator orientation="vertical" className="mx-0.5 !h-6" />

            {/* Block: Bullet List, Ordered List, Blockquote, HR */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive("bulletList")}
                  onPressedChange={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                  disabled={!editor.can().toggleBulletList()}
                  aria-label="Bullet List"
                >
                  <List className="size-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Bullet List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive("orderedList")}
                  onPressedChange={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                  disabled={!editor.can().toggleOrderedList()}
                  aria-label="Ordered List"
                >
                  <ListOrdered className="size-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Ordered List</TooltipContent>
            </Tooltip>

            <TaskListToolbar editor={editor} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive("blockquote")}
                  onPressedChange={() =>
                    editor.chain().focus().toggleBlockquote().run()
                  }
                  disabled={!editor.can().toggleBlockquote()}
                  aria-label="Blockquote"
                >
                  <TextQuote className="size-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Blockquote</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    editor.chain().focus().setHorizontalRule().run()
                  }
                  aria-label="Horizontal Rule"
                >
                  <Minus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Horizontal Rule</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-0.5 !h-6" />

            {/* Alignment */}
            <AlignmentToolbar editor={editor} />

            <Separator orientation="vertical" className="mx-0.5 !h-6" />

            {/* Insert: Image Upload, YouTube */}
            <ImageUploadToolbar editor={editor} />
            <YouTubeToolbar editor={editor} />
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <RichTextDisplay
            html={editor.getHTML()}
            emptyFallback={
              <p className="p-3 text-sm text-muted-foreground">
                Nothing to preview
              </p>
            }
            className="min-h-[120px] border-b border-dashed p-3 text-sm leading-relaxed"
          />
        )}

        {/* Editor Content — always mounted, hidden when previewing */}
        <div className={preview ? "hidden" : undefined}>
          <EditorContent editor={editor} />
          <BubbleMenuBar editor={editor} />
        </div>

        {/* Character / Word Count */}
        <div className="flex justify-end border-t px-3 py-1 text-xs text-muted-foreground">
          {limit
            ? `${charCount.characters}/${limit} characters`
            : `${charCount.characters} characters`}
          {" · "}
          {charCount.words} words
        </div>
      </div>
    </TooltipProvider>
  );
}
