"use client";

import { useState } from "react";
import { useOrganization } from "@/modules/organization";
import {
  AddServiceSheet,
  CategoryFilterChips,
  ServicesList,
} from "@/modules/services";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function ServicesPage() {
  const { activeOrganization, currentRole } = useOrganization();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  if (!activeOrganization) return null;

  const isOwner = currentRole === "owner";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage your salon&apos;s services and pricing
          </p>
        </div>
        {isOwner && (
          <AddServiceSheet
            organizationId={activeOrganization._id}
            defaultCategoryId={
              selectedCategoryId
                ? (selectedCategoryId as Id<"serviceCategories">)
                : undefined
            }
          />
        )}
      </div>

      {/* Category Filter Chips */}
      <CategoryFilterChips
        organizationId={activeOrganization._id}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        isOwner={isOwner}
      />

      {/* Services List */}
      <ServicesList
        organizationId={activeOrganization._id}
        categoryId={selectedCategoryId}
        isOwner={isOwner}
      />
    </div>
  );
}
