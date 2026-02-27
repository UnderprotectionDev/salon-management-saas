"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSpreadsheet } from "../lib/spreadsheet-context";

export function FormulaBar() {
  const {
    selectedCell,
    editingValue,
    setEditingValue,
    cells,
    onCellChange,
    readOnlyCells,
  } = useSpreadsheet();

  const inputRef = useRef<HTMLInputElement>(null);
  const isFormula = editingValue.startsWith("=");
  const isReadOnly = readOnlyCells.has(selectedCell);

  function handleCommit() {
    if (isReadOnly) return;
    const existing = cells[selectedCell] || { value: "" };
    onCellChange(selectedCell, { ...existing, value: editingValue });
  }

  function handleCancel() {
    setEditingValue(cells[selectedCell]?.value ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleCommit();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  return (
    <div className="flex items-center h-9 border-b border-border bg-background gap-0 shrink-0">
      {/* Name Box */}
      <div className="flex items-center h-full px-2.5 gap-1 border-r border-border min-w-[88px]">
        <span className="text-xs font-medium text-foreground tabular-nums tracking-wide flex-1 text-center">
          {selectedCell}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </div>

      {/* Confirm / Cancel buttons */}
      <div className="flex items-center h-full px-1 gap-0.5 border-r border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCommit}
          disabled={isReadOnly}
          className="h-6 w-6 p-0 text-primary hover:bg-accent hover:text-accent-foreground"
          aria-label="Confirm"
        >
          <Check className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* fx label */}
      <div className="flex items-center justify-center h-full w-9 border-r border-border shrink-0">
        <span className="text-xs text-muted-foreground italic font-serif select-none">
          fx
        </span>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 h-full px-3 text-xs bg-background outline-none font-mono focus:bg-accent/20"
        style={{ color: isFormula ? "var(--primary)" : undefined }}
        spellCheck={false}
        autoComplete="off"
        readOnly={isReadOnly}
        placeholder={isReadOnly ? "Read-only cell" : "Select a cell..."}
      />
    </div>
  );
}
