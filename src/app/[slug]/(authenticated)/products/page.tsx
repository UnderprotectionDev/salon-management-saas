"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOrganization } from "@/modules/organization";
import {
  AddProductDialog,
  CategorySidebar,
  ProductsList,
} from "@/modules/products";

export default function ProductsPage() {
  const { activeOrganization, currentRole, isLoading } = useOrganization();
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const isOwner = currentRole === "owner";

  // Redirect non-owners (staff cannot access products)
  useEffect(() => {
    if (!isLoading && activeOrganization && currentRole === "staff") {
      router.replace(`/${activeOrganization.slug}/dashboard`);
    }
  }, [isLoading, currentRole, router, activeOrganization]);

  if (!activeOrganization || isLoading) return null;
  if (!isOwner) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your salon&apos;s product catalog and inventory
          </p>
        </div>
        <AddProductDialog
          organizationId={activeOrganization._id}
          defaultCategoryId={
            selectedCategoryId
              ? (selectedCategoryId as Parameters<
                  typeof AddProductDialog
                >[0]["defaultCategoryId"])
              : undefined
          }
        />
      </div>

      {/* Content: Category Sidebar + Products Table */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Category Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <CategorySidebar
            organizationId={activeOrganization._id}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        {/* Products Table */}
        <div className="flex-1 min-w-0">
          <ProductsList
            organizationId={activeOrganization._id}
            categoryId={selectedCategoryId}
          />
        </div>
      </div>
    </div>
  );
}
