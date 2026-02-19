"use client";

import { DesignCard } from "./DesignCard";

interface Design {
  _id: string;
  name: string;
  category: string;
  status: string;
  description?: string;
  tags: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  createdByStaffId?: string;
}

interface DesignGridProps {
  designs: Design[];
  slug: string;
  isOwner: boolean;
  currentStaffId: string | undefined;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
}

export function DesignGrid({
  designs,
  slug,
  isOwner,
  currentStaffId,
  onToggleStatus,
  onDelete,
}: DesignGridProps) {
  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-16">
        <p className="text-muted-foreground text-sm">
          No designs match your filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {designs.map((design) => {
        const canEdit = isOwner || design.createdByStaffId === currentStaffId;

        return (
          <DesignCard
            key={design._id}
            design={design}
            slug={slug}
            isOwner={isOwner}
            canEdit={canEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
