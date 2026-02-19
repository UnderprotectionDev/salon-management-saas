"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSuggestedTags } from "./category-presets";
import { DesignPreviewCard } from "./DesignPreviewCard";

// =============================================================================
// Details Step
// =============================================================================

interface DetailsStepProps {
  category: string;
  name: string;
  description: string;
  tags: string[];
  imagePreview: string | null;
  disabled: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function DetailsStep({
  category,
  name,
  description,
  tags,
  imagePreview,
  disabled,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
}: DetailsStepProps) {
  const [tagInput, setTagInput] = useState("");
  const suggestedTags = getSuggestedTags(category);
  const maxDescription = 500;

  function addTag(value: string) {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  // Filter out tags that are already added
  const availableSuggestions = suggestedTags.filter((t) => !tags.includes(t));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h2 className="mb-1 font-semibold text-xl">Design Details</h2>
      <p className="mb-6 text-muted-foreground text-sm">
        Add a name and details to help customers find your design
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <Label htmlFor="design-name" className="mb-1.5 block">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="design-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={`e.g. Golden ${category}`}
              disabled={disabled}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="design-description">
                Description{" "}
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
              </Label>
              <span
                className={`text-xs ${
                  description.length > maxDescription
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {description.length}/{maxDescription}
              </span>
            </div>
            <Textarea
              id="design-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description of the design style, technique, or inspiration..."
              rows={3}
              disabled={disabled}
              maxLength={maxDescription}
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-1.5 block">
              Tags{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full hover:bg-muted"
                    aria-label={`Remove tag ${tag}`}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) addTag(tagInput);
                }}
                placeholder={
                  tags.length === 0 ? "Type tag, press Enter..." : ""
                }
                className="min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                disabled={disabled}
              />
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              Press Enter or comma to add a tag
            </p>

            {/* Suggested tags */}
            {availableSuggestions.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-muted-foreground text-xs">
                  Suggested tags:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      disabled={disabled}
                      className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <p className="mb-3 text-center text-muted-foreground text-xs">
              Customer preview
            </p>
            <DesignPreviewCard
              name={name}
              category={category}
              description={description}
              tags={tags}
              imagePreview={imagePreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
