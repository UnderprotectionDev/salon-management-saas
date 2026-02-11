"use client";

import { useState } from "react";
import { useOrganization } from "@/modules/organization";
import {
  AddServiceDialog,
  CategorySidebar,
  ServicesList,
} from "@/modules/services";

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
          <AddServiceDialog
            organizationId={activeOrganization._id}
            defaultCategoryId={
              selectedCategoryId
                ? (selectedCategoryId as Parameters<
                    typeof AddServiceDialog
                  >[0]["defaultCategoryId"])
                : undefined
            }
          />
        )}
      </div>

      {/* Content: Category Sidebar + Services Table */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Category Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <CategorySidebar
            organizationId={activeOrganization._id}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            isOwner={isOwner}
          />
        </div>

        {/* Services Table */}
        <div className="flex-1 min-w-0">
          <ServicesList
            organizationId={activeOrganization._id}
            categoryId={selectedCategoryId}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>
  );
}
