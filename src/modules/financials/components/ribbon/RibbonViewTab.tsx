"use client";

import { ChevronDown, Download, HelpCircle, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SectionLabel, TBtn } from "./TBtn";

interface RibbonViewTabProps {
  selectedCell: string;
  hasFrozen: boolean;
  setFreeze: (row: number, col: number) => void;
  handleExportCsv: () => void;
  onOpenShortcuts?: () => void;
}

export function RibbonViewTab({
  selectedCell,
  hasFrozen,
  setFreeze,
  handleExportCsv,
  onOpenShortcuts,
}: RibbonViewTabProps) {
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
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setFreeze(1, 0)}>
                Freeze Top Row
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFreeze(0, 1)}>
                Freeze First Column
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const parsed = selectedCell.match(/^([A-Z]+)(\d+)$/);
                  if (!parsed) return;
                  let col = 0;
                  for (const ch of parsed[1])
                    col = col * 26 + ch.charCodeAt(0) - 64;
                  const row = Number.parseInt(parsed[2], 10) - 1;
                  setFreeze(row, col - 1);
                }}
              >
                Freeze Panes (at selection)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setFreeze(0, 0)}
                disabled={!hasFrozen}
              >
                <Unlock className="w-3.5 h-3.5 mr-1" />
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
