"use client";

import type { Editor } from "@tiptap/react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AlignmentToolbarProps {
  editor: Editor;
}

const ALIGNMENTS = [
  { value: "left", icon: AlignLeft, label: "Align Left" },
  { value: "center", icon: AlignCenter, label: "Align Center" },
  { value: "right", icon: AlignRight, label: "Align Right" },
  { value: "justify", icon: AlignJustify, label: "Justify" },
] as const;

export function AlignmentToolbar({ editor }: AlignmentToolbarProps) {
  return (
    <>
      {ALIGNMENTS.map((align) => {
        const Icon = align.icon;
        return (
          <Tooltip key={align.value}>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor.isActive({ textAlign: align.value })}
                onPressedChange={() =>
                  editor.chain().focus().setTextAlign(align.value).run()
                }
                aria-label={align.label}
              >
                <Icon className="size-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>{align.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
