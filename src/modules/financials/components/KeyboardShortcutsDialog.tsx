"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUTS } from "../lib/keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {KEYBOARD_SHORTCUTS.map((cat) => (
            <div key={cat.name}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {cat.name}
              </h4>
              <div className="space-y-1">
                {cat.shortcuts.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{s.description}</span>
                    <div className="flex items-center gap-0.5">
                      {/* Note: splitting on "+" will not correctly render shortcuts containing a literal "+" key */}
                      {s.keys.split("+").map((key) => (
                        <kbd
                          key={key}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded"
                        >
                          {key.trim()}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
