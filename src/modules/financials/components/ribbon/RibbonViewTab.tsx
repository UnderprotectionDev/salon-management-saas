"use client";

import { ChevronDown, Download, HelpCircle, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { parseRef } from "../../lib/eval";
import { colLabel } from "../../lib/spreadsheet-utils";
import { SectionLabel, TBtn } from "./TBtn";

interface RibbonViewTabProps {
  selectedCell: string;
  hasFrozen: boolean;
  freezeRow: number;
  freezeCol: number;
  setFreeze: (row: number, col: number) => void;
  handleExportCsv: () => void;
  onOpenShortcuts?: () => void;
}

export function RibbonViewTab({
  selectedCell,
  hasFrozen,
  freezeRow,
  freezeCol,
  setFreeze,
  handleExportCsv,
  onOpenShortcuts,
}: RibbonViewTabProps) {
  // Parsed selected cell for freeze menus
  const selectedRef = parseRef(selectedCell);
  const selectedRowIdx = selectedRef?.row ?? 0; // 0-indexed
  const selectedColIdx = selectedRef?.col ?? 0; // 0-indexed
  const selectedColLetter = colLabel(selectedColIdx);
  const selectedRowNum = selectedRowIdx + 1; // 1-indexed display

  return (
    <>
      {/* Freeze section */}
      <div className="flex flex-col items-center gap-0 shrink-0">
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-1.5 gap-0.5 text-xs text-foreground",
                  hasFrozen && "bg-accent text-accent-foreground",
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs">Freeze</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {/* Freeze Rows submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Freeze Rows</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuCheckboxItem
                    checked={freezeRow === 0}
                    onSelect={() => setFreeze(0, freezeCol)}
                  >
                    No rows
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={freezeRow === 1}
                    onSelect={() => setFreeze(1, freezeCol)}
                  >
                    1 row
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={freezeRow === 2}
                    onSelect={() => setFreeze(2, freezeCol)}
                  >
                    2 rows
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={
                      freezeRow === selectedRowIdx + 1 && selectedRowIdx > 0
                    }
                    disabled={selectedRowIdx === 0}
                    onSelect={() => setFreeze(selectedRowIdx + 1, freezeCol)}
                  >
                    Up to row {selectedRowNum} ({selectedRowIdx + 1}{" "}
                    {selectedRowIdx + 1 === 1 ? "row" : "rows"})
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Freeze Columns submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Freeze Columns</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuCheckboxItem
                    checked={freezeCol === 0}
                    onSelect={() => setFreeze(freezeRow, 0)}
                  >
                    No columns
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={freezeCol === 1}
                    onSelect={() => setFreeze(freezeRow, 1)}
                  >
                    1 column
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={freezeCol === 2}
                    onSelect={() => setFreeze(freezeRow, 2)}
                  >
                    2 columns
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={
                      freezeCol === selectedColIdx + 1 && selectedColIdx > 0
                    }
                    disabled={selectedColIdx === 0}
                    onSelect={() => setFreeze(freezeRow, selectedColIdx + 1)}
                  >
                    Up to column {selectedColLetter} ({selectedColIdx + 1}{" "}
                    {selectedColIdx + 1 === 1 ? "column" : "columns"})
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Freeze at selection */}
              <DropdownMenuItem
                onSelect={() =>
                  setFreeze(selectedRowIdx + 1, selectedColIdx + 1)
                }
                disabled={selectedRowIdx === 0 && selectedColIdx === 0}
              >
                <Lock className="w-3.5 h-3.5" />
                Freeze at {selectedCell}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Unfreeze All */}
              <DropdownMenuItem
                onSelect={() => setFreeze(0, 0)}
                disabled={!hasFrozen}
              >
                <Unlock className="w-3.5 h-3.5" />
                Unfreeze All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SectionLabel>Freeze Panes</SectionLabel>
      </div>

      {/* Export */}
      <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
      <div className="flex flex-col items-center gap-0 shrink-0">
        <TBtn
          icon={<Download className="w-3.5 h-3.5" />}
          label="Export CSV"
          onClick={handleExportCsv}
        />
        <SectionLabel>Export</SectionLabel>
      </div>

      {/* Keyboard shortcuts */}
      {onOpenShortcuts && (
        <>
          <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
          <div className="flex flex-col items-center gap-0 shrink-0">
            <TBtn
              icon={<HelpCircle className="w-3.5 h-3.5" />}
              label="Shortcuts"
              shortcut="Ctrl+/"
              onClick={onOpenShortcuts}
            />
            <SectionLabel>Help</SectionLabel>
          </div>
        </>
      )}
    </>
  );
}
