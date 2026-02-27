"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { GRID } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const { cells, setSelectedCell, setSelectionRange, columnCount, rowCount } = useSpreadsheet();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setCurrentIndex(0);
      return;
    }
    const lq = query.toLowerCase();
    const found: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < columnCount; c++) {
        const ref = cellRef(r, c);
        const val = cells[ref]?.value;
        if (val?.toLowerCase().includes(lq)) {
          found.push(ref);
        }
      }
    }
    setMatches(found);
    setCurrentIndex(0);
    if (found.length > 0) {
      setSelectedCell(found[0]);
      setSelectionRange(null);
    }
  }, [query, cells, setSelectedCell, setSelectionRange, columnCount, rowCount]);

  function navigate(dir: 1 | -1) {
    if (matches.length === 0) return;
    const next = (currentIndex + dir + matches.length) % matches.length;
    setCurrentIndex(next);
    setSelectedCell(matches[next]);
    setSelectionRange(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(e.shiftKey ? -1 : 1);
    }
  }

  if (!open) return null;

  return (
    <div className="absolute top-1 right-1 z-50 flex items-center gap-1 bg-background border border-border rounded-md shadow-md p-1.5">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find..."
        className="h-7 w-44 text-xs"
      />
      <span className="text-[10px] text-muted-foreground tabular-nums min-w-[48px] text-center">
        {matches.length > 0
          ? `${currentIndex + 1}/${matches.length}`
          : query
            ? "0/0"
            : ""}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => navigate(-1)}
        disabled={matches.length === 0}
        aria-label="Previous match"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => navigate(1)}
        disabled={matches.length === 0}
        aria-label="Next match"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={onClose}
        aria-label="Close search"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
