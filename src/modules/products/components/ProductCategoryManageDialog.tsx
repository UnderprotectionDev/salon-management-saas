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
import { ConvexError } from "convex/values";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RichEditor } from "@/components/rich-editor";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getConvexErrorMessage } from "@/lib/convex-error";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ProductCategoryManageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organization">;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
};

type CategoryItem = {
  _id: Id<"productCategories">;
  name: string;
  description?: string;
  status: "active" | "inactive";
  productCount: number;
};

function SortableCategoryRow({
  category,
  isEditing,
  editName,
  editDescription,
  onEditStart,
  onEditNameChange,
  onEditDescriptionChange,
  onEditSave,
  onEditCancel,
  onDelete,
}: {
  category: CategoryItem;
  isEditing: boolean;
  editName: string;
  editDescription: string;
  onEditStart: () => void;
  onEditNameChange: (name: string) => void;
  onEditDescriptionChange: (desc: string) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-card px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="size-4" />
        </span>

        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
            className="h-7 text-sm flex-1"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={onEditStart}
            className="flex-1 text-left text-sm truncate hover:text-primary transition-colors"
          >
            {category.name}
          </button>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
          {category.productCount}{" "}
          {category.productCount === 1 ? "product" : "products"}
        </span>

        {isEditing ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onEditSave}
          >
            <span className="sr-only">Save</span>
            &#10003;
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="mt-2">
          <RichEditor
            value={editDescription}
            onChange={onEditDescriptionChange}
            placeholder="Category description (optional)"
          />
        </div>
      )}
    </div>
  );
}

export function ProductCategoryManageDialog({
  open,
  onOpenChange,
  organizationId,
  selectedCategoryId,
  onSelectCategory,
}: ProductCategoryManageDialogProps) {
  const rawCategories = useQuery(api.productCategories.list, {
    organizationId,
  }) as CategoryItem[] | undefined;
  const updateCategory = useMutation(api.productCategories.update);
  const removeCategory = useMutation(api.productCategories.remove);
  const reorderCategories = useMutation(api.productCategories.reorder);
  const createCategory = useMutation(api.productCategories.create);

  const categories = rawCategories?.filter((c) => c.status === "active");

  const [editingId, setEditingId] = useState<Id<"productCategories"> | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<Id<"productCategories"> | null>(null);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleEditStart = (category: CategoryItem) => {
    setEditingId(category._id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
  };

  const handleEditSave = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateCategory({
        organizationId,
        categoryId: editingId,
        name: editName.trim(),
        description: editDescription || undefined,
      });
      setEditingId(null);
      toast.success("Category updated");
    } catch (error) {
      toast.error(getConvexErrorMessage(error, "Failed to update category"));
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
      toast.error(getConvexErrorMessage(error, "Failed to delete category"));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

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

  const handleAddCategory = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await createCategory({
        organizationId,
        name: newName.trim(),
      });
      setNewName("");
      toast.success("Category created");
    } catch (error) {
      if (
        error instanceof ConvexError &&
        (error.data as { code?: string })?.code === "ALREADY_EXISTS"
      ) {
        toast.info("Category already exists");
      } else {
        toast.error(getConvexErrorMessage(error, "Failed to create category"));
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              Add, rename, reorder, or delete product categories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {categories && categories.length > 0 ? (
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
                    <SortableCategoryRow
                      key={category._id}
                      category={category}
                      isEditing={editingId === category._id}
                      editName={editName}
                      editDescription={editDescription}
                      onEditDescriptionChange={setEditDescription}
                      onEditStart={() => handleEditStart(category)}
                      onEditNameChange={setEditName}
                      onEditSave={handleEditSave}
                      onEditCancel={() => setEditingId(null)}
                      onDelete={() => setDeleteTarget(category._id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories yet
              </p>
            )}
          </div>

          {/* Add Category */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isAdding}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <Button
              size="sm"
              disabled={!newName.trim() || isAdding}
              onClick={handleAddCategory}
            >
              {isAdding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span className="ml-1">Add</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Products in this
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
    </>
  );
}
