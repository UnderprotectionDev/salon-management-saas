"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { DesignEmptyState } from "./design-catalog/DesignEmptyState";
import { DesignFilters } from "./design-catalog/DesignFilters";
import { DesignGrid } from "./design-catalog/DesignGrid";

// =============================================================================
// Main component (refactored — logic only, UI delegated to sub-components)
// =============================================================================

export function DesignCatalogManager() {
  const { activeOrganization, currentRole, currentStaff } = useOrganization();
  const isOwner = currentRole === "owner";

  const designs = useQuery(
    api.designCatalog.listAllByOrg,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const setStatus = useMutation(api.designCatalog.setStatus);
  const removeDesign = useMutation(api.designCatalog.remove);

  const [deleteId, setDeleteId] = useState<Id<"designCatalog"> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!activeOrganization) return null;

  const organizationId = activeOrganization._id;
  const slug = activeOrganization.slug ?? activeOrganization._id;

  // ---- Empty state ----
  if (designs && designs.length === 0) {
    return <DesignEmptyState slug={slug} />;
  }

  // ---- Derived data ----
  const existingCategories = designs
    ? [...new Set(designs.map((d) => d.category))].sort()
    : [];

  const filteredDesigns = designs
    ? designs.filter((d) => {
        // Category filter
        if (categoryFilter !== "all" && d.category !== categoryFilter)
          return false;
        // Status filter
        if (statusFilter !== "all" && d.status !== statusFilter) return false;
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = d.name.toLowerCase().includes(q);
          const matchCategory = d.category.toLowerCase().includes(q);
          const matchTags = d.tags.some((t) => t.toLowerCase().includes(q));
          const matchDescription = d.description?.toLowerCase().includes(q);
          if (!matchName && !matchCategory && !matchTags && !matchDescription)
            return false;
        }
        return true;
      })
    : [];

  // ---- Handlers ----

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      await setStatus({
        organizationId,
        designId: id as Id<"designCatalog">,
        status: currentStatus === "active" ? "inactive" : "active",
      });
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await removeDesign({
        organizationId,
        designId: deleteId,
      });
      toast.success("Design deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete design");
    }
  }

  return (
    <>
      {/* Filters & header */}
      <DesignFilters
        slug={slug}
        categories={existingCategories}
        activeCategory={categoryFilter}
        activeStatus={statusFilter}
        onCategoryChange={setCategoryFilter}
        onStatusChange={setStatusFilter}
        onSearchChange={setSearchQuery}
        totalCount={designs?.length ?? 0}
      />

      {/* Staff notice */}
      {!isOwner && (
        <p className="mt-3 mb-3 text-muted-foreground text-xs">
          You can add and edit your own designs. Owners manage status and
          deletion.
        </p>
      )}

      {/* Design grid */}
      <div className="mt-4">
        <DesignGrid
          designs={filteredDesigns}
          slug={slug}
          isOwner={isOwner}
          currentStaffId={currentStaff?._id}
          onToggleStatus={handleToggleStatus}
          onDelete={(id) => setDeleteId(id as Id<"designCatalog">)}
        />
      </div>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Design</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The design will be permanently
              removed from the catalog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
