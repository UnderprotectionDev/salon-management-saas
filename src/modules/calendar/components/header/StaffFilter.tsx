"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

type StaffFilterProps = {
  staffList: Doc<"staff">[];
  staffFilter: Id<"staff"> | "all";
  onStaffFilterChange: (value: Id<"staff"> | "all") => void;
};

export function StaffFilter({
  staffList,
  staffFilter,
  onStaffFilterChange,
}: StaffFilterProps) {
  return (
    <Select
      value={staffFilter ?? "all"}
      onValueChange={(v) => onStaffFilterChange(v as Id<"staff"> | "all")}
    >
      <SelectTrigger
        className="w-[160px] h-8 text-xs"
        aria-label="Filter by staff member"
      >
        <SelectValue placeholder="All Staff" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Staff</SelectItem>
        {staffList.map((s) => (
          <SelectItem key={s._id} value={s._id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
