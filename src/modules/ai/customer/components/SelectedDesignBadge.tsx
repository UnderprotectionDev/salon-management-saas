import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SelectedDesignBadge({
  name,
  category,
  onClear,
}: {
  name: string;
  category: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
      <Check className="h-4 w-4 text-primary" />
      <span className="font-medium text-sm">{name || "Design selected"}</span>
      {category && (
        <Badge variant="secondary" className="text-xs">
          {category}
        </Badge>
      )}
      <button
        type="button"
        className="ml-auto text-muted-foreground hover:text-foreground"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
