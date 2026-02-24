"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

type CategoryName =
  | "hair"
  | "nails"
  | "skin"
  | "spa"
  | "body"
  | "medical"
  | "art"
  | "specialty";

/**
 * Shared hook for salon preference category forms.
 * Handles save mutation, submitting state, dirty tracking, and toast feedback.
 */
export function useCategoryForm<T extends Record<string, unknown>>(
  category: CategoryName,
  initialData: T,
) {
  const update = useMutation(api.userProfile.updateCategoryPreferences);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = (currentData: T) =>
    JSON.stringify(currentData) !== JSON.stringify(initialData);

  const handleSave = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      await update({ category, data });
      toast.success(
        `${category.charAt(0).toUpperCase() + category.slice(1)} preferences saved`,
      );
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, isDirty, handleSave };
}
