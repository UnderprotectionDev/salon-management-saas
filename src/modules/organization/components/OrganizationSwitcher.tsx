"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "../providers/OrganizationProvider";

type OrganizationSwitcherProps = {
  showCreateButton?: boolean;
  className?: string;
};

export function OrganizationSwitcher({
  showCreateButton = true,
  className,
}: OrganizationSwitcherProps) {
  const {
    activeOrganization,
    organizations,
    isLoading,
    setActiveOrganization,
  } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // No organizations - show create prompt
  if (organizations.length === 0) {
    return (
      <Link
        href="/onboarding"
        className="flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-input bg-transparent px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="size-4" />
        <span>Create Salon</span>
      </Link>
    );
  }

  // Single organization - just show the name
  if (organizations.length === 1) {
    return (
      <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="truncate">{organizations[0].name}</span>
      </div>
    );
  }

  // Multiple organizations - show selector
  return (
    <Select
      value={activeOrganization?._id ?? ""}
      onValueChange={(value) => {
        if (value === "create") {
          // Navigation handled by Link
          return;
        }
        const org = organizations.find((o) => o._id === value);
        if (org) {
          setActiveOrganization(org);
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select salon">
          {activeOrganization && (
            <span className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <span className="truncate">{activeOrganization.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org._id} value={org._id}>
            <span className="flex items-center gap-2">
              <Building2 className="size-4" />
              <span>{org.name}</span>
            </span>
          </SelectItem>
        ))}
        {showCreateButton && (
          <>
            <SelectSeparator />
            <Link
              href="/onboarding"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="size-4" />
              <span>Create new salon</span>
            </Link>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
