"use client";

import type { Editor } from "@tiptap/react";
import { ListChecks } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskListToolbarProps {
  editor: Editor;
}

export function TaskListToolbar({ editor }: TaskListToolbarProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={editor.isActive("taskList")}
          onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
          disabled={!editor.can().toggleTaskList()}
          aria-label="Task List"
        >
          <ListChecks className="size-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>Task List</TooltipContent>
    </Tooltip>
  );
}
