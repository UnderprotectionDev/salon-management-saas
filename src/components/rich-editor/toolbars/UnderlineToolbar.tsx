"use client";

import type { Editor } from "@tiptap/react";
import { UnderlineIcon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UnderlineToolbarProps {
  editor: Editor;
}

export function UnderlineToolbar({ editor }: UnderlineToolbarProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().toggleUnderline()}
          aria-label="Underline"
        >
          <UnderlineIcon className="size-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>Underline</TooltipContent>
    </Tooltip>
  );
}
