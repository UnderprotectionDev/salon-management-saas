"use client";

import { useMutation } from "convex/react";
import {
  Check,
  ClipboardCopy,
  Edit2,
  Plus,
  Scissors,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  FORMULA_CATALOG,
  type FormulaEntry,
  SALON_SUBCATEGORIES,
} from "../lib/formula-catalog";

interface CustomFormula {
  _id: Id<"customFormulas">;
  name: string;
  body: string;
  description?: string;
}

interface SalonFormulasTabProps {
  customFormulas: CustomFormula[];
}

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success("Copied to clipboard");
    })
    .catch(() => toast.error("Failed to copy"));
}

function SalonFormulaCard({ formula }: { formula: FormulaEntry }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm font-mono">{formula.name}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => copyToClipboard(`=${formula.syntax}`)}
        >
          <ClipboardCopy className="size-3 mr-1" />
          Insert
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{formula.description}</p>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] font-mono">
          {formula.syntax}
        </Badge>
      </div>
      {formula.params && formula.params.length > 0 && (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {formula.params.map((p) => (
            <div key={p.name}>
              <span className="font-mono text-foreground/70">{p.name}</span>{" "}
              &mdash; {p.description}
            </div>
          ))}
        </div>
      )}
      <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">
        {formula.example}
      </div>
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
      <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-3">
        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            placeholder="FORMULA_NAME"
            className="font-mono text-sm h-8"
          />
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="=A1*0.18"
            className="font-mono text-sm h-8"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="text-sm min-h-[60px]"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 text-xs"
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
            <Check className="size-3 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
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
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm font-mono">{formula.name}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => copyToClipboard(`=${formula.name}()`)}
          >
            <ClipboardCopy className="size-3 mr-1" />
            Insert
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setEditing(true)}
          >
            <Edit2 className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(formula._id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
      {formula.description && (
        <p className="text-xs text-muted-foreground">{formula.description}</p>
      )}
      <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1">
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
    <div className="rounded-lg border-2 border-dashed border-primary/30 bg-card p-4 space-y-3">
      <h4 className="text-sm font-medium">New Custom Formula</h4>
      <div className="space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="FORMULA_NAME (e.g. MY_TAX)"
          className="font-mono text-sm h-8"
          pattern="[A-Z_][A-Z0-9_]*"
        />
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="=A1*0.18"
          className="font-mono text-sm h-8"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="text-sm min-h-[60px]"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !body.startsWith("=")}
        >
          <Check className="size-3 mr-1" />
          Create
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function SalonFormulasTab({ customFormulas }: SalonFormulasTabProps) {
  const { activeOrganization } = useOrganization();
  const [showCreate, setShowCreate] = useState(false);
  const removeMut = useMutation(api.customFormulas.remove);
  const updateMut = useMutation(api.customFormulas.update);

  const salonFormulas = FORMULA_CATALOG.filter((f) => f.category === "Salon");

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
    <div className="flex-1 overflow-auto p-6 space-y-8">
      {/* Built-in Salon Formulas */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Scissors className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Salon Formulas</h2>
          <Badge variant="secondary" className="text-xs">
            {salonFormulas.length} built-in
          </Badge>
        </div>

        {SALON_SUBCATEGORIES.map((sub) => (
          <div key={sub.label} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {sub.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sub.formulas.map((name) => {
                const formula = salonFormulas.find((f) => f.name === name);
                if (!formula) return null;
                return <SalonFormulaCard key={name} formula={formula} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Formulas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">My Formulas</h2>
            {customFormulas.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {customFormulas.length}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              className="rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[120px]"
            >
              <Plus className="size-5" />
              <span className="text-sm font-medium">Create Custom Formula</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
