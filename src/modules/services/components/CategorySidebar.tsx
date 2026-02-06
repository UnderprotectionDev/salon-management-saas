"use client";

import { useMutation, useQuery } from "convex/react";
import { Edit2, LayoutGrid, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AddCategoryPopover } from "./AddCategoryPopover";

type CategorySidebarProps = {
  organizationId: Id<"organization">;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isAdminOrOwner: boolean;
};

export function CategorySidebar({
  organizationId,
  selectedCategoryId,
  onSelectCategory,
  isAdminOrOwner,
}: CategorySidebarProps) {
  const categories = useQuery(api.serviceCategories.list, { organizationId });
  const updateCategory = useMutation(api.serviceCategories.update);
  const removeCategory = useMutation(api.serviceCategories.remove);

  const [editingId, setEditingId] = useState<Id<"serviceCategories"> | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<Id<"serviceCategories"> | null>(null);

  if (categories === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const totalServiceCount = categories.reduce(
    (sum, c) => sum + c.serviceCount,
    0,
  );

  const handleEditStart = (
    categoryId: Id<"serviceCategories">,
    name: string,
  ) => {
    setEditingId(categoryId);
    setEditName(name);
  };

  const handleEditSave = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateCategory({
        organizationId,
        categoryId: editingId,
        name: editName.trim(),
      });
      setEditingId(null);
      toast.success("Category updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update category";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeCategory({ organizationId, categoryId: deleteTarget });
      if (selectedCategoryId === deleteTarget) {
        onSelectCategory(null);
      }
      setDeleteTarget(null);
      toast.success("Category deleted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete category";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
          selectedCategoryId === null
            ? "bg-accent font-medium"
            : "text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <LayoutGrid className="size-4" />
          All Services
        </span>
        <span className="text-xs text-muted-foreground">
          {totalServiceCount}
        </span>
      </button>

      {categories.map((category) => (
        <div key={category._id} className="group relative">
          {editingId === category._id ? (
            <div className="flex items-center gap-1 px-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={handleEditSave}
              >
                <span className="sr-only">Save</span>
                &#10003;
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectCategory(category._id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                selectedCategoryId === category._id
                  ? "bg-accent font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <span className="truncate">{category.name}</span>
              <span className="flex items-center gap-1">
                {isAdminOrOwner && (
                  <span className="hidden items-center gap-0.5 group-hover:flex">
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded p-0.5 hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(category._id, category.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          handleEditStart(category._id, category.name);
                        }
                      }}
                    >
                      <Edit2 className="size-3" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded p-0.5 hover:bg-muted text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(category._id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setDeleteTarget(category._id);
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                    </span>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {category.serviceCount}
                </span>
              </span>
            </button>
          )}
        </div>
      ))}

      {isAdminOrOwner && (
        <div className="pt-2">
          <AddCategoryPopover organizationId={organizationId} />
        </div>
      )}

      {/* Delete Category AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Services in this
              category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
