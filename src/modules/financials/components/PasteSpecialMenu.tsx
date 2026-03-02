"use client";

import { ClipboardPaste } from "lucide-react";

interface PasteSpecialMenuProps {
  x: number;
  y: number;
  onSelect: (mode: "all" | "values" | "format") => void;
  onClose: () => void;
}

export function PasteSpecialMenu({
  x,
  y,
  onSelect,
  onClose,
}: PasteSpecialMenuProps) {
  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop for menu dismiss */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 99 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          zIndex: 100,
          minWidth: 180,
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: "4px 0",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onSelect("all");
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          <ClipboardPaste className="size-3.5" />
          <span className="flex-1 text-left">Paste All</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect("values");
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          <span className="size-3.5 flex items-center justify-center text-[10px] font-bold">
            V
          </span>
          <span className="flex-1 text-left">Values Only</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect("format");
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          <span className="size-3.5 flex items-center justify-center text-[10px] font-bold">
            F
          </span>
          <span className="flex-1 text-left">Format Only</span>
        </button>
      </div>
    </>
  );
}
