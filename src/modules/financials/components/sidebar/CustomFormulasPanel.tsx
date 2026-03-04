import { useMutation } from "convex/react";
import { Check, ClipboardCopy, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface CustomFormula {
  _id: Id<"customFormulas">;
  name: string;
  body: string;
  description?: string;
}

interface CustomFormulasPanelProps {
  customFormulas: CustomFormula[];
}

export function CustomFormulasPanel({
  customFormulas,
}: CustomFormulasPanelProps) {
  const { activeOrganization } = useOrganization();
  const [showCreate, setShowCreate] = useState(false);
  const removeMut = useMutation(api.customFormulas.remove);
  const updateMut = useMutation(api.customFormulas.update);

  async function handleDelete(id: Id<"customFormulas">) {
    if (!activeOrganization) return;
    try {
      await removeMut({ organizationId: activeOrganization._id, id });
      toast.success("Formula deleted");
    } catch {
      toast.error("Failed to delete formula");
    }
  }

  async function handleUpdate(
    id: Id<"customFormulas">,
    data: { name?: string; body?: string; description?: string },
  ) {
    if (!activeOrganization) return;
    const patch: Record<string, string> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.body !== undefined) patch.body = data.body;
    if (data.description !== undefined) patch.description = data.description;
    try {
      await updateMut({ organizationId: activeOrganization._id, id, ...patch });
      toast.success("Formula updated");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update formula";
      toast.error(msg);
    }
  }

  return (
    <div className="p-3 space-y-2">
      {customFormulas.length === 0 && !showCreate && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No custom formulas yet. Create one below.
        </p>
      )}

      {customFormulas.map((f) => (
        <CustomFormulaCard
          key={f._id}
          formula={f}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}

      {showCreate ? (
        <CreateFormulaForm onClose={() => setShowCreate(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full rounded-md border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 p-3 flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3.5" />
          <span className="text-xs font-medium">Create Formula</span>
        </button>
      )}
    </div>
  );
}

function CustomFormulaCard({
  formula,
  onDelete,
  onUpdate,
}: {
  formula: CustomFormula;
  onDelete: (id: Id<"customFormulas">) => void;
  onUpdate: (
    id: Id<"customFormulas">,
    data: { name?: string; body?: string; description?: string },
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(formula.name);
  const [body, setBody] = useState(formula.body);
  const [description, setDescription] = useState(formula.description ?? "");

  if (editing) {
    return (
      <div className="rounded-md border border-primary/30 bg-card p-2.5 space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="FORMULA_NAME"
          className="font-mono text-xs h-7"
        />
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="=A1*0.18"
          className="font-mono text-xs h-7"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="text-xs min-h-[50px]"
        />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={async () => {
              await onUpdate(formula._id, {
                name: name !== formula.name ? name : undefined,
                body: body !== formula.body ? body : undefined,
                description:
                  description !== (formula.description ?? "")
                    ? description
                    : undefined,
              });
              setEditing(false);
            }}
          >
            <Check className="size-3 mr-0.5" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => {
              setName(formula.name);
              setBody(formula.body);
              setDescription(formula.description ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 bg-card p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-1">
        <code className="text-xs font-bold text-primary truncate">
          {formula.name}
        </code>
        <div className="flex items-center shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() =>
              navigator.clipboard
                .writeText(`=${formula.name}()`)
                .then(() => toast.success("Copied to clipboard"))
                .catch(() => toast.error("Failed to copy"))
            }
          >
            <ClipboardCopy className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setEditing(true)}
          >
            <Edit2 className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(formula._id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
      {formula.description && (
        <p className="text-[10px] text-muted-foreground">
          {formula.description}
        </p>
      )}
      <div className="text-[10px] font-mono text-muted-foreground/80 bg-muted/50 rounded px-1.5 py-0.5">
        {formula.body}
      </div>
    </div>
  );
}

function CreateFormulaForm({ onClose }: { onClose: () => void }) {
  const { activeOrganization } = useOrganization();
  const createMut = useMutation(api.customFormulas.create);
  const [name, setName] = useState("");
  const [body, setBody] = useState("=");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!activeOrganization || !name.trim() || !body.trim()) return;
    setLoading(true);
    try {
      await createMut({
        organizationId: activeOrganization._id,
        name: name.trim(),
        body: body.trim(),
        description: description.trim() || undefined,
      });
      toast.success(`Formula "${name.trim().toUpperCase()}" created`);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create formula";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border-2 border-dashed border-primary/30 bg-card p-2.5 space-y-2">
      <h4 className="text-xs font-medium">New Custom Formula</h4>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase())}
        placeholder="FORMULA_NAME"
        className="font-mono text-xs h-7"
        pattern="[A-Z_][A-Z0-9_]*"
      />
      <Input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="=A1*0.18"
        className="font-mono text-xs h-7"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="text-xs min-h-[50px]"
      />
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !body.startsWith("=")}
        >
          <Check className="size-3 mr-0.5" />
          Create
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
