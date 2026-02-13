"use client";

import { Users } from "lucide-react";
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
  onSelect: (id: Id<"staff"> | null) => void;
  showAnyOption?: boolean;
  disabled?: boolean;
};

export function StaffSelector({
  staffMembers,
  selectedId,
  onSelect,
  showAnyOption = true,
  disabled = false,
}: StaffSelectorProps) {
  if (staffMembers.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No available staff found for these services.
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap gap-3 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      {/* "Any Available" option */}
      {showAnyOption && staffMembers.length > 1 && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex flex-col items-center gap-2 p-3 border rounded-sm min-w-[80px] transition-colors ${
            selectedId === null
              ? "bg-primary text-primary-foreground border-primary"
              : "hover:bg-accent/50"
          }`}
        >
          <div
            className={`flex items-center justify-center size-12 rounded-full ${
              selectedId === null ? "bg-primary-foreground/20" : "bg-muted"
            }`}
          >
            <Users className="size-5" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-center">
            Any
            <br />
            Available
          </span>
        </button>
      )}
      {staffMembers.map((staff) => {
        const isSelected = selectedId === staff._id;
        return (
          <button
            key={staff._id}
            type="button"
            onClick={() => onSelect(staff._id)}
            className={`flex flex-col items-center gap-2 p-3 border rounded-sm min-w-[80px] transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-accent/50"
            }`}
          >
            <Avatar className="size-12">
              {staff.imageUrl && <AvatarImage src={staff.imageUrl} />}
              <AvatarFallback
                className={
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : ""
                }
              >
                {staff.name[0]?.toUpperCase() ?? "S"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-center leading-tight">
              {staff.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
