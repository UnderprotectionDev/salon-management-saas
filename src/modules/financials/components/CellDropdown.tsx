"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CellDropdownProps {
  options: { value: string; label: string }[];
  currentLabel: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export function CellDropdown({
  options,
  currentLabel,
  onSelect,
  onClose,
  style,
}: CellDropdownProps) {
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-dropdown-item]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        onSelect(filtered[highlightIndex].value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: dropdown needs keyboard interaction
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        minWidth: 160,
        maxHeight: 220,
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        overflow: "hidden",
        ...style,
      }}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: "4px 6px", borderBottom: "1px solid var(--border)" }}>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightIndex(0);
          }}
          placeholder="Search..."
          style={{
            width: "100%",
            fontSize: 12,
            outline: "none",
            border: "none",
            background: "transparent",
            color: "var(--foreground)",
            padding: "2px 0",
          }}
        />
      </div>
      <div ref={listRef} style={{ maxHeight: 180, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--muted-foreground)",
            }}
          >
            No results
          </div>
        ) : (
          filtered.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              data-dropdown-item
              onClick={() => onSelect(opt.value)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 transition-colors",
                idx === highlightIndex && "bg-accent",
              )}
            >
              {opt.label === currentLabel && (
                <Check className="size-3 text-primary shrink-0" />
              )}
              {opt.label !== currentLabel && <span className="size-3 shrink-0" />}
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
