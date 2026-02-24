"use client";

import { useMutation } from "convex/react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_ALLERGENS } from "@/modules/onboarding";
import { api } from "../../../../convex/_generated/api";

export function AllergiesSection({
  allergies,
  allergyNotes,
}: {
  allergies: string[];
  allergyNotes: string;
}) {
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const [selected, setSelected] = useState<string[]>(allergies);
  const [notes, setNotes] = useState(allergyNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty =
    JSON.stringify([...selected].sort()) !==
      JSON.stringify([...allergies].sort()) || notes !== allergyNotes;

  const toggleAllergen = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        allergies: selected.length > 0 ? selected : undefined,
        allergyNotes: notes.trim() || undefined,
      });
      toast.success("Allergies updated");
    } catch {
      toast.error("Failed to update allergies");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          Allergies & Sensitivities
        </CardTitle>
        <CardDescription>
          Important safety information for your appointments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset
          className="grid grid-cols-2 gap-2"
          aria-labelledby="allergies-heading"
        >
          <legend id="allergies-heading" className="sr-only">
            Select your allergies
          </legend>
          {COMMON_ALLERGENS.map((allergen) => (
            <div key={allergen.id} className="flex items-center gap-2">
              <Checkbox
                id={`allergy-${allergen.id}`}
                checked={selected.includes(allergen.id)}
                onCheckedChange={() => toggleAllergen(allergen.id)}
              />
              <Label
                htmlFor={`allergy-${allergen.id}`}
                className="text-sm cursor-pointer"
              >
                {allergen.label}
              </Label>
            </div>
          ))}
        </fieldset>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="List any other sensitivities..."
          rows={2}
        />
        <Button
          onClick={handleSave}
          disabled={isSubmitting || !isDirty}
          size="sm"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
