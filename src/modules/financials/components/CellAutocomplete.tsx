"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FORMULA_CATALOG } from "../lib/formula-catalog";

/** Build a lookup map from name → syntax for fast display */
const SYNTAX_MAP = new Map(FORMULA_CATALOG.map((f) => [f.name, f.syntax]));

const SUGGESTION_LIMIT = 8;

/** Filter and rank suggestions by prefix/substring match */
function filterSuggestions(
  suggestions: string[],
  input: string,
  limit: number,
): string[] {
  if (!input.trim()) return [];
  const lower = input.toLowerCase();
  return suggestions
    .filter((s) => s.toLowerCase().includes(lower))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    })
    .slice(0, limit);
}

interface CellAutocompleteProps {
  suggestions: string[];
  inputValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export function CellAutocomplete({
  suggestions,
  inputValue,
  onSelect,
  style,
}: CellAutocompleteProps) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const prevInputRef = useRef(inputValue);

  const filtered = filterSuggestions(suggestions, inputValue, SUGGESTION_LIMIT);

  if (prevInputRef.current !== inputValue) {
    prevInputRef.current = inputValue;
    setHighlightIndex(0);
  }

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-ac-item]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: "absolute",
        zIndex: 50,
        minWidth: 200,
        maxHeight: 180,
        overflowY: "auto",
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "2px 0",
        ...style,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {filtered.map((item, idx) => (
        <button
          key={item}
          type="button"
          data-ac-item
          onClick={() => onSelect(item)}
          onMouseEnter={() => setHighlightIndex(idx)}
          className={cn(
            "w-full text-left px-2.5 py-1 text-xs transition-colors flex items-center gap-2",
            idx === highlightIndex && "bg-accent",
          )}
        >
          <span className="font-semibold shrink-0">{item}</span>
          <span className="text-muted-foreground truncate text-[10px] font-mono">
            {SYNTAX_MAP.get(item) ?? ""}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Hook for managing autocomplete keyboard within the cell input */
export function useAutocompleteKeyboard(
  suggestions: string[],
  inputValue: string,
  onSelect: (value: string) => void,
) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const filtered = filterSuggestions(suggestions, inputValue, SUGGESTION_LIMIT);
  const isOpen = filtered.length > 0;

  function handleKeyDown(e: React.KeyboardEvent): boolean {
    if (!isOpen) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return true;
    }
    if (e.key === "Tab" && isOpen) {
      if (filtered[highlightIndex]) {
        e.preventDefault();
        onSelect(filtered[highlightIndex]);
        return true;
      }
    }
    return false;
  }

  return { isOpen, filtered, highlightIndex, handleKeyDown, setHighlightIndex };
}
