"use client";

import {
  ArrowDownAZ,
  ArrowUpZA,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Filter,
  Plus,
  Scissors,
  ShieldCheck,
  Sigma,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { FormulaFn } from "../lib/formula-helpers";
import type { ContextMenuState } from "../lib/spreadsheet-types";

interface GridContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  isReadOnlyTab: boolean;
  isHeaderRow: boolean;
  isTotalRow: boolean;
  canInsertRow: boolean;
  canDeleteRow: boolean;
  canInsertColumn?: boolean;
  canDeleteColumn?: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClearCell: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRow: () => void;
  onInsertColumnLeft?: () => void;
  onInsertColumnRight?: () => void;
  onDeleteColumn?: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onFilterByColumn: () => void;
  hasMultiCellSelection?: boolean;
  onCopyFormula?: (fn: FormulaFn) => void;
  onDataValidation?: () => void;
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

interface SubMenuProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function SubMenu({ icon, label, children }: SubMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: submenu hover behavior
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-accent cursor-default">
        <span className="size-3.5 shrink-0 flex items-center justify-center">
          {icon}
        </span>
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight className="size-3 text-muted-foreground" />
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            left: "100%",
            top: 0,
            minWidth: 180,
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "4px 0",
            zIndex: 101,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function GridContextMenu({
  state,
  onClose,
  isReadOnlyTab,
  isHeaderRow,
  isTotalRow,
  canInsertRow,
  canDeleteRow,
  canInsertColumn,
  canDeleteColumn,
  onCopy,
  onCut,
  onPaste,
  onClearCell,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onInsertColumnLeft,
  onInsertColumnRight,
  onDeleteColumn,
  onSortAsc,
  onSortDesc,
  onFilterByColumn,
  hasMultiCellSelection,
  onCopyFormula,
  onDataValidation,
}: GridContextMenuProps) {
  const rowDisabled = isReadOnlyTab || isHeaderRow || isTotalRow;
  const isColumnHeader = state.row === -1;

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
        {!isColumnHeader && (
          <>
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
          </>
        )}

        {/* Column operations */}
        {onInsertColumnLeft && onInsertColumnRight && onDeleteColumn && (
          <>
            <MenuItem
              icon={<Plus className="size-3.5" />}
              label="Insert Column Left"
              onClick={() => handleClick(onInsertColumnLeft)}
              disabled={isReadOnlyTab || !canInsertColumn}
            />
            <MenuItem
              icon={<Plus className="size-3.5" />}
              label="Insert Column Right"
              onClick={() => handleClick(onInsertColumnRight)}
              disabled={isReadOnlyTab || !canInsertColumn}
            />
            <MenuItem
              icon={<Trash2 className="size-3.5" />}
              label="Delete Column"
              onClick={() => handleClick(onDeleteColumn)}
              disabled={isReadOnlyTab || !canDeleteColumn}
              destructive
            />
            <MenuSeparator />
          </>
        )}

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

        {/* Insert Function submenu — only for multi-cell selection */}
        {hasMultiCellSelection && onCopyFormula && (
          <>
            <MenuSeparator />
            <SubMenu
              icon={<Sigma className="size-3.5" />}
              label="Insert Function"
            >
              <MenuItem
                icon={<Sigma className="size-3.5" />}
                label="Copy SUM formula"
                onClick={() => handleClick(() => onCopyFormula("SUM"))}
              />
              <MenuItem
                icon={<Sigma className="size-3.5" />}
                label="Copy AVERAGE formula"
                onClick={() => handleClick(() => onCopyFormula("AVERAGE"))}
              />
              <MenuItem
                icon={<Sigma className="size-3.5" />}
                label="Copy COUNT formula"
                onClick={() => handleClick(() => onCopyFormula("COUNT"))}
              />
              <MenuItem
                icon={<Sigma className="size-3.5" />}
                label="Copy MAX formula"
                onClick={() => handleClick(() => onCopyFormula("MAX"))}
              />
              <MenuItem
                icon={<Sigma className="size-3.5" />}
                label="Copy MIN formula"
                onClick={() => handleClick(() => onCopyFormula("MIN"))}
              />
            </SubMenu>
          </>
        )}

        {/* Data Validation */}
        {onDataValidation && !isColumnHeader && (
          <>
            <MenuSeparator />
            <MenuItem
              icon={<ShieldCheck className="size-3.5" />}
              label="Data Validation..."
              onClick={() => handleClick(onDataValidation)}
              disabled={isReadOnlyTab}
            />
          </>
        )}

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
