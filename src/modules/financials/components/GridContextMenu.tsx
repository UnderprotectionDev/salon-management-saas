"use client";

import {
  ArrowDownAZ,
  ArrowUpZA,
  ClipboardPaste,
  Copy,
  Filter,
  Plus,
  Scissors,
  Trash2,
  XCircle,
} from "lucide-react";
import type { ContextMenuState } from "../lib/spreadsheet-types";

interface GridContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  isReadOnlyTab: boolean;
  isHeaderRow: boolean;
  isTotalRow: boolean;
  canInsertRow: boolean;
  canDeleteRow: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClearCell: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRow: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onFilterByColumn: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  destructive,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed ${destructive ? "text-destructive" : ""}`}
    >
      <span className="size-3.5 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-muted-foreground ml-4">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function MenuSeparator() {
  return <div className="h-px bg-border my-1" />;
}

export function GridContextMenu({
  state,
  onClose,
  isReadOnlyTab,
  isHeaderRow,
  isTotalRow,
  canInsertRow,
  canDeleteRow,
  onCopy,
  onCut,
  onPaste,
  onClearCell,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onSortAsc,
  onSortDesc,
  onFilterByColumn,
}: GridContextMenuProps) {
  const rowDisabled = isReadOnlyTab || isHeaderRow || isTotalRow;

  function handleClick(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <>
      {/* Backdrop to close menu */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop for menu dismiss */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          left: state.x,
          top: state.y,
          zIndex: 100,
          minWidth: 200,
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: "4px 0",
        }}
      >
        {/* Row operations */}
        <MenuItem
          icon={<Plus className="size-3.5" />}
          label="Insert Row Above"
          onClick={() => handleClick(onInsertRowAbove)}
          disabled={rowDisabled || !canInsertRow}
        />
        <MenuItem
          icon={<Plus className="size-3.5" />}
          label="Insert Row Below"
          onClick={() => handleClick(onInsertRowBelow)}
          disabled={rowDisabled || !canInsertRow}
        />
        <MenuItem
          icon={<Trash2 className="size-3.5" />}
          label="Delete Row"
          onClick={() => handleClick(onDeleteRow)}
          disabled={rowDisabled || !canDeleteRow}
          destructive
        />

        <MenuSeparator />

        {/* Clipboard */}
        <MenuItem
          icon={<Copy className="size-3.5" />}
          label="Copy"
          shortcut="Ctrl+C"
          onClick={() => handleClick(onCopy)}
        />
        <MenuItem
          icon={<Scissors className="size-3.5" />}
          label="Cut"
          shortcut="Ctrl+X"
          onClick={() => handleClick(onCut)}
          disabled={isReadOnlyTab}
        />
        <MenuItem
          icon={<ClipboardPaste className="size-3.5" />}
          label="Paste"
          shortcut="Ctrl+V"
          onClick={() => handleClick(onPaste)}
          disabled={isReadOnlyTab}
        />
        <MenuItem
          icon={<XCircle className="size-3.5" />}
          label="Clear Cell"
          onClick={() => handleClick(onClearCell)}
          disabled={isReadOnlyTab || isHeaderRow}
        />

        <MenuSeparator />

        {/* Sort & Filter */}
        <MenuItem
          icon={<ArrowDownAZ className="size-3.5" />}
          label="Sort A → Z"
          onClick={() => handleClick(onSortAsc)}
        />
        <MenuItem
          icon={<ArrowUpZA className="size-3.5" />}
          label="Sort Z → A"
          onClick={() => handleClick(onSortDesc)}
        />
        <MenuItem
          icon={<Filter className="size-3.5" />}
          label="Filter by Column"
          onClick={() => handleClick(onFilterByColumn)}
        />
      </div>
    </>
  );
}
