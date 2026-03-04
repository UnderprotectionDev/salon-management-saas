import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormulaEntry } from "../../lib/formula-catalog";

interface PreviewPanelProps {
  formula: FormulaEntry;
  onInsert: () => void;
  onClose: () => void;
}

export function PreviewPanel({
  formula,
  onInsert,
  onClose,
}: PreviewPanelProps) {
  return (
    <div className="border-t border-border bg-card p-2.5 shrink-0 max-h-[140px] overflow-y-auto">
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <code className="text-xs font-bold text-primary">{formula.name}</code>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="default"
            size="sm"
            className="h-5 px-2 text-[10px]"
            onClick={onInsert}
          >
            Insert
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      <div className="text-[10px] font-mono bg-muted/50 rounded px-1.5 py-0.5 mb-1.5 break-all">
        {formula.syntax}
      </div>

      {formula.params && formula.params.length > 0 && (
        <table className="w-full text-[10px] mb-1.5">
          <tbody>
            {formula.params.map((p) => (
              <tr key={p.name} className="text-muted-foreground">
                <td className="pr-1.5 py-0.5 font-mono text-foreground/70 whitespace-nowrap">
                  {p.name}
                </td>
                <td className="py-0.5">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="text-[10px] text-muted-foreground/70 font-mono break-all">
        e.g. {formula.example}
      </div>
    </div>
  );
}
