"use client";

import { Ban } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const THEME_COLORS = [
  "#ffffff",
  "#000000",
  "#e7e6e6",
  "#44546a",
  "#4472c4",
  "#ed7d31",
  "#a5a5a5",
  "#ffc000",
  "#5b9bd5",
  "#70ad47",
];

const STANDARD_COLORS = [
  "#c00000",
  "#ff0000",
  "#ffc000",
  "#ffff00",
  "#92d050",
  "#00b050",
  "#00b0f0",
  "#0070c0",
  "#002060",
  "#7030a0",
];

const TINT_ROWS = [
  [
    "#f2dcdb",
    "#dce6f1",
    "#ebf1de",
    "#e5e0ec",
    "#dbeef3",
    "#fde9d9",
    "#ddd9c3",
    "#c4d79b",
    "#b7dee8",
    "#e6b9b8",
  ],
  [
    "#e6b8b7",
    "#b8cce4",
    "#d8e4bc",
    "#ccc0da",
    "#b7dde8",
    "#fcd5b4",
    "#c4bd97",
    "#92cddc",
    "#8db4e2",
    "#d99694",
  ],
  [
    "#da9694",
    "#95b3d7",
    "#c4d79b",
    "#b1a0c7",
    "#92cddc",
    "#fabf8f",
    "#c4bd97",
    "#4bacc6",
    "#558ed5",
    "#c0504d",
  ],
  [
    "#993366",
    "#4f81bd",
    "#9bbb59",
    "#8064a2",
    "#4bacc6",
    "#f79646",
    "#948a54",
    "#31859c",
    "#376092",
    "#953735",
  ],
  [
    "#632523",
    "#244062",
    "#4f6228",
    "#3f3151",
    "#215968",
    "#984807",
    "#494529",
    "#1f497d",
    "#17375e",
    "#60223b",
  ],
];

interface ColorPickerProps {
  trigger: React.ReactNode;
  onColorSelect: (color: string | null) => void;
}

export function ColorPicker({ trigger, onColorSelect }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-2">
          {/* No fill */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent"
            onClick={() => onColorSelect(null)}
          >
            <Ban className="w-3.5 h-3.5" />
            No Fill
          </button>

          {/* Theme colors */}
          <div>
            <span className="text-[10px] text-muted-foreground font-medium mb-1 block">
              Theme Colors
            </span>
            <div className="flex gap-0.5">
              {THEME_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform"
                  style={{ background: c }}
                  onClick={() => onColorSelect(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Tints */}
          <div className="flex flex-col gap-0.5">
            {TINT_ROWS.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed tint rows
              <div key={i} className="flex gap-0.5">
                {row.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-5 h-5 rounded-sm border border-border/50 hover:scale-110 transition-transform"
                    style={{ background: c }}
                    onClick={() => onColorSelect(c)}
                    title={c}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Standard colors */}
          <div>
            <span className="text-[10px] text-muted-foreground font-medium mb-1 block">
              Standard Colors
            </span>
            <div className="flex gap-0.5">
              {STANDARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform"
                  style={{ background: c }}
                  onClick={() => onColorSelect(c)}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
