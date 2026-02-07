"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Id } from "../../../../convex/_generated/dataModel";

type Staff = {
  _id: Id<"staff">;
  name: string;
  imageUrl?: string;
  bio?: string;
};

type StaffSelectorProps = {
  staffMembers: Staff[];
  selectedId: Id<"staff"> | null;
  onSelect: (id: Id<"staff">) => void;
};

export function StaffSelector({
  staffMembers,
  selectedId,
  onSelect,
}: StaffSelectorProps) {
  if (staffMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Bu hizmetler için uygun personel bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {staffMembers.map((staff) => (
        <button
          key={staff._id}
          type="button"
          onClick={() => onSelect(staff._id)}
          aria-pressed={selectedId === staff._id}
          className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
            selectedId === staff._id ? "border-primary bg-primary/5" : ""
          }`}
        >
          <Avatar className="size-10">
            {staff.imageUrl && <AvatarImage src={staff.imageUrl} />}
            <AvatarFallback>
              {staff.name[0]?.toUpperCase() ?? "S"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium">{staff.name}</div>
            {staff.bio && (
              <p className="text-sm text-muted-foreground truncate">
                {staff.bio}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
