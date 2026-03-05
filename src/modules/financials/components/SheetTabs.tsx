"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { evalFormula } from "../lib/spreadsheet-formula";
import type { SheetTab } from "../lib/spreadsheet-types";
import { colLabel } from "../lib/spreadsheet-utils";

interface SheetTabsProps {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddSheet?: () => void;
  onRenameSheet?: (id: string, name: string) => void;
  onDeleteSheet?: (id: string) => void;
  onReorderSheets?: (orderedIds: string[]) => void;
}

export function SheetTabs({
  tabs,
  activeTab,
  onTabChange,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  onReorderSheets,
}: SheetTabsProps) {
  const { cells, selectedCell, selectionRange, zoom, setZoom } =
    useSpreadsheet();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SheetTab | null>(null);

  // Drag-to-reorder sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tabs.findIndex((t) => t.id === active.id);
    const newIndex = tabs.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(tabs, oldIndex, newIndex);
    onReorderSheets?.(reordered.map((t) => t.id));
  }

  // Compute stats for selected range
  const selectedValues: number[] = [];
  if (selectionRange) {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const ref = `${colLabel(c)}${r + 1}`;
        const raw = cells[ref]?.value;
        if (raw) {
          let resolved: string;
          try {
            resolved = raw.startsWith("=") ? evalFormula(raw, cells) : raw;
          } catch {
            continue;
          }
          const n = Number(resolved);
          if (!Number.isNaN(n)) selectedValues.push(n);
        }
      }
    }
  } else {
    const raw = cells[selectedCell]?.value;
    if (raw) {
      let resolved: string;
      try {
        resolved = raw.startsWith("=") ? evalFormula(raw, cells) : raw;
      } catch {
        resolved = raw;
      }
      const n = Number(resolved);
      if (!Number.isNaN(n)) selectedValues.push(n);
    }
  }

  const sum = selectedValues.reduce((a, b) => a + b, 0);
  const avg = selectedValues.length > 0 ? sum / selectedValues.length : 0;
  const count = selectionRange
    ? (Math.abs(selectionRange.endRow - selectionRange.startRow) + 1) *
      (Math.abs(selectionRange.endCol - selectionRange.startCol) + 1)
    : 1;
  const min = selectedValues.length > 0 ? Math.min(...selectedValues) : 0;
  const max = selectedValues.length > 0 ? Math.max(...selectedValues) : 0;

  async function handleStatClick(fn: FormulaFn) {
    const formula = buildSelectionFormula(fn, selectionRange);
    if (!formula) return;
    const ok = await copyFormulaToClipboard(formula);
    if (ok) toast.success(`Copied ${formula}`);
  }

  function startRename(tab: SheetTab) {
    setRenamingId(tab.id);
    setRenameValue(tab.label);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameSheet?.(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  return (
    <div className="border-t border-border bg-background shrink-0">
      {/* Sheet tabs row */}
      <div className="flex items-stretch h-9 border-b border-border">
        <div className="flex items-end flex-1 overflow-x-auto px-2 gap-0.5 pt-1.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tabs.map((t) => t.id)}
              strategy={horizontalListSortingStrategy}
            >
              {tabs.map((tab) => (
                <SortableTab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTab}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  onTabChange={onTabChange}
                  onStartRename={startRename}
                  onSetRenameValue={setRenameValue}
                  onCommitRename={commitRename}
                  onCancelRename={() => setRenamingId(null)}
                  onDeleteSheet={
                    onDeleteSheet ? () => setDeleteTarget(tab) : undefined
                  }
                />
              ))}
            </SortableContext>
          </DndContext>

          {onAddSheet && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddSheet}
                    className="h-7 w-7 p-0 self-center ml-0.5 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Add Sheet
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sheet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.label}&quot;?
              All data in this sheet will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteSheet?.(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 h-7 bg-muted/30">
        {/* Left: status + stats */}
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted-foreground font-medium">
            Ready
          </span>
          {selectedValues.length > 1 && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleStatClick("AVERAGE")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Avg:{" "}
                    <span className="text-foreground font-medium">
                      {avg.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Click to copy =AVERAGE() formula
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleStatClick("COUNT")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Count:{" "}
                    <span className="text-foreground font-medium">{count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Click to copy =COUNT() formula
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleStatClick("SUM")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Sum:{" "}
                    <span className="text-foreground font-medium">
                      {sum.toLocaleString()}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Click to copy =SUM() formula
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleStatClick("MIN")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Min:{" "}
                    <span className="text-foreground font-medium">
                      {min.toLocaleString()}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Click to copy =MIN() formula
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleStatClick("MAX")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Max:{" "}
                    <span className="text-foreground font-medium">
                      {max.toLocaleString()}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Click to copy =MAX() formula
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Right: zoom */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setZoom(Math.max(25, zoom - 10))}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <div className="w-20">
            <Slider
              min={25}
              max={200}
              step={5}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="w-full"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="text-[11px] text-muted-foreground hover:text-foreground w-10 text-right tabular-nums transition-colors"
          >
            {zoom}%
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sortable tab item for drag-to-reorder */
function SortableTab({
  tab,
  isActive,
  renamingId,
  renameValue,
  onTabChange,
  onStartRename,
  onSetRenameValue,
  onCommitRename,
  onCancelRename,
  onDeleteSheet,
}: {
  tab: SheetTab;
  isActive: boolean;
  renamingId: string | null;
  renameValue: string;
  onTabChange: (id: string) => void;
  onStartRename: (tab: SheetTab) => void;
  onSetRenameValue: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDeleteSheet?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : isActive ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => onTabChange(tab.id)}
      onDoubleClick={() => onStartRename(tab)}
      className={cn(
        "relative px-3.5 h-full text-xs rounded-t-md border border-b-0 transition-colors cursor-default whitespace-nowrap select-none flex items-center gap-1",
        isActive
          ? "bg-background border-border text-foreground font-medium -mb-px"
          : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground -ml-1"
      >
        <GripVertical className="w-3 h-3" />
      </span>
      {isActive && (
        <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-md bg-[var(--sheet-active-ring)]" />
      )}
      {renamingId === tab.id ? (
        <input
          // biome-ignore lint/a11y/noAutofocus: needed for inline rename UX
          autoFocus
          value={renameValue}
          onChange={(e) => onSetRenameValue(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
          }}
          className="text-xs outline-none bg-transparent w-20"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        tab.label
      )}
      {/* Delete button */}
      {isActive && onDeleteSheet && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSheet();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onDeleteSheet();
            }
          }}
          className="ml-1 hover:text-destructive cursor-pointer"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
