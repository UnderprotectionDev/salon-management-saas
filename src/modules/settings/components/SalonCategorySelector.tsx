"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { USER_SALON_CATEGORIES } from "../lib/salon-preferences-constants";
import { api } from "../../../../convex/_generated/api";

export function SalonCategorySelector({
  selectedCategories,
}: {
  selectedCategories: string[];
}) {
  const updateCategories = useMutation(
    api.userProfile.updateSelectedCategories,
  );
  const [selected, setSelected] = useState<string[]>(selectedCategories);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const hasChanges =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...selectedCategories].sort());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCategories({ selectedCategories: selected });
      toast.success("Salon categories updated");
    } catch {
      toast.error("Failed to update categories");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {USER_SALON_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selected.includes(cat.key);
          return (
            <button
              key={cat.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(cat.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors hover:bg-accent",
                isSelected && "border-primary bg-primary/5 font-medium",
              )}
            >
              <Icon className="size-4" />
              {cat.label}
            </button>
          );
        })}
      </div>
      {hasChanges && (
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          Save Categories
        </Button>
      )}
    </div>
  );
}
