"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useOrganization } from "../providers/OrganizationProvider";

export function OrganizationSwitcher() {
  const { organizations, isLoading } = useOrganization();

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

  // Show salon name (single org only)
  return (
    <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
      <Building2 className="size-4 text-muted-foreground" />
      <span className="truncate">{organizations[0].name}</span>
    </div>
  );
}
