"use client";

import type { Editor } from "@tiptap/react";
import { Youtube } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface YouTubeToolbarProps {
  editor: Editor;
}

export function YouTubeToolbar({ editor }: YouTubeToolbarProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url.trim()) return;
    editor.commands.setYoutubeVideo({ src: url.trim() });
    setUrl("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="YouTube Video"
            >
              <Youtube className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>YouTube Video</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="YouTube URL"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!url.trim()}>
              Embed
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
