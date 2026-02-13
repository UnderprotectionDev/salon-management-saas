"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import { Edit2, GripVertical, LayoutGrid, Trash2 } from "lucide-react";
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

type CategoryItem = {
  _id: Id<"serviceCategories">;
  name: string;
  serviceCount: number;
};

function SortableCategoryItem({
  category,
  isOwner,
  isSelected,
  isEditing,
  editName,
  onSelect,
  onEditStart,
  onEditNameChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: {
  category: CategoryItem;
  isOwner: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onEditStart: () => void;
  onEditNameChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1 px-1"
      >
        <Input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditSave();
            if (e.key === "Escape") onEditCancel();
          }}
          className="h-8 text-sm"
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onEditSave}
        >
          <span className="sr-only">Save</span>
          &#10003;
        </Button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
          isSelected ? "bg-accent font-medium" : "text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-1 truncate">
          {isOwner && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                // Allow dnd-kit keyboard events (Space, Enter, Arrow keys) to propagate
                if (
                  !["Space", "Enter", "ArrowUp", "ArrowDown"].includes(e.key)
                ) {
                  e.stopPropagation();
                }
              }}
            >
              <GripVertical className="size-3" />
            </span>
          )}
          <span className="truncate">{category.name}</span>
        </span>
        <span className="flex items-center gap-1">
          {isOwner && (
            <span className="hidden items-center gap-0.5 group-hover:flex">
              <span
                role="button"
                tabIndex={0}
                className="rounded p-0.5 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStart();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onEditStart();
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
                  onDelete();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onDelete();
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
    </div>
  );
}

type CategorySidebarProps = {
  organizationId: Id<"organization">;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isOwner: boolean;
};

export function CategorySidebar({
  organizationId,
  selectedCategoryId,
  onSelectCategory,
  isOwner,
}: CategorySidebarProps) {
  const categories = useQuery(api.serviceCategories.list, { organizationId });
  const updateCategory = useMutation(api.serviceCategories.update);
  const removeCategory = useMutation(api.serviceCategories.remove);
  const reorderCategories = useMutation(api.serviceCategories.reorder);

  const [editingId, setEditingId] = useState<Id<"serviceCategories"> | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<Id<"serviceCategories"> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c._id === active.id);
    const newIndex = categories.findIndex((c) => c._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    try {
      await reorderCategories({
        organizationId,
        categoryIds: reordered.map((c) => c._id),
      });
    } catch {
      toast.error("Failed to reorder categories");
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c._id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableCategoryItem
              key={category._id}
              category={category}
              isOwner={isOwner}
              isSelected={selectedCategoryId === category._id}
              isEditing={editingId === category._id}
              editName={editName}
              onSelect={() => onSelectCategory(category._id)}
              onEditStart={() => handleEditStart(category._id, category.name)}
              onEditNameChange={setEditName}
              onEditSave={handleEditSave}
              onEditCancel={() => setEditingId(null)}
              onDelete={() => setDeleteTarget(category._id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {isOwner && (
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
