"use client";

import type { Editor } from "@tiptap/react";
import {
  ChevronDown,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeadingToolbarProps {
  editor: Editor;
}

const HEADINGS = [
  { label: "Heading 1", icon: Heading1, level: 1 },
  { label: "Heading 2", icon: Heading2, level: 2 },
  { label: "Heading 3", icon: Heading3, level: 3 },
  { label: "Heading 4", icon: Heading4, level: 4 },
] as const;

export function HeadingToolbar({ editor }: HeadingToolbarProps) {
  const active = HEADINGS.find((h) =>
    editor.isActive("heading", { level: h.level }),
  );
  const TriggerIcon = active?.icon ?? Heading;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-0.5 px-1.5"
            >
              <TriggerIcon className="size-4" />
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Heading</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {HEADINGS.map((heading) => {
          const Icon = heading.icon;
          return (
            <DropdownMenuItem
              key={heading.level}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({
                    level: heading.level as 1 | 2 | 3 | 4,
                  })
                  .run()
              }
            >
              <Icon className="size-4 mr-2" />
              {heading.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
