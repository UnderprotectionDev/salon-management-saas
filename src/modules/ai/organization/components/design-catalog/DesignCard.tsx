"use client";

import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface DesignCardProps {
  design: {
    _id: string;
    name: string;
    category: string;
    status: string;
    description?: string;
    tags: string[];
    imageUrl?: string;
    thumbnailUrl?: string;
  };
  slug: string;
  isOwner: boolean;
  canEdit: boolean;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
}

export function DesignCard({
  design,
  slug,
  isOwner,
  canEdit,
  onToggleStatus,
  onDelete,
}: DesignCardProps) {
  const isInactive = design.status === "inactive";

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md ${
        isInactive ? "opacity-60 grayscale" : ""
      }`}
    >
      {/* Image */}
      {design.imageUrl ? (
        // biome-ignore lint/performance/noImgElement: storage URL, not static asset
        <img
          src={design.thumbnailUrl ?? design.imageUrl}
          alt={design.name}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-muted">
          <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Status badge */}
      <div className="absolute right-2 top-2 z-10">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            design.status === "active"
              ? "bg-green-500/90 text-white"
              : "bg-black/60 text-white"
          }`}
        >
          {design.status === "inactive" ? "Draft" : "Active"}
        </span>
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
        <p className="truncate font-semibold text-sm text-white">
          {design.name}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className="bg-white/20 text-white text-[10px]"
          >
            {design.category}
          </Badge>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          {isOwner && (
            <Switch
              checked={design.status === "active"}
              onCheckedChange={() => onToggleStatus(design._id, design.status)}
              aria-label={`Toggle ${design.name}`}
              className="scale-75"
            />
          )}
          {canEdit && (
            <Button variant="secondary" size="icon" className="h-7 w-7" asChild>
              <Link href={`/${slug}/ai/designs/${design._id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {isOwner && (
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(design._id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom info (visible when not hovering) */}
      <div className="relative z-0 border-t p-2.5 transition-opacity group-hover:opacity-0">
        <p className="truncate font-medium text-sm">{design.name}</p>
        <p className="truncate text-muted-foreground text-xs">
          {design.category}
        </p>
      </div>
    </div>
  );
}
