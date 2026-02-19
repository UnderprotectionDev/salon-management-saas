"use client";

import { Badge } from "@/components/ui/badge";
import { getCategoryVisual } from "./category-presets";

// =============================================================================
// Live Preview Card (shown in Step 3)
// =============================================================================

interface DesignPreviewCardProps {
  name: string;
  category: string;
  description: string;
  tags: string[];
  imagePreview: string | null;
}

export function DesignPreviewCard({
  name,
  category,
  description,
  tags,
  imagePreview,
}: DesignPreviewCardProps) {
  const visual = getCategoryVisual(category);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {/* Image area */}
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {imagePreview ? (
          // biome-ignore lint/performance/noImgElement: blob/storage URL preview
          <img
            src={imagePreview}
            alt={name || "Design preview"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${visual.gradient}`}
          >
            {(() => {
              const Icon = visual.icon;
              return <Icon className="h-12 w-12 text-foreground/20" />;
            })()}
          </div>
        )}
      </div>

      {/* Details area */}
      <div className="p-4">
        <h4 className="truncate font-semibold text-sm">
          {name || "Design Name"}
        </h4>

        <div className="mt-1.5 flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
        </div>

        {description && (
          <p className="mt-2 line-clamp-2 text-muted-foreground text-xs">
            {description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
