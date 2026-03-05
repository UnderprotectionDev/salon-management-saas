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
import {
  Copy,
  Edit2,
  GripVertical,
  History,
  MoreHorizontal,
  Package,
  PackageX,
  Trash2,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { BulkSelectionBar } from "./BulkSelectionBar";
import { EditProductSheet } from "./EditProductSheet";
import { InventoryHistorySheet } from "./InventoryHistorySheet";
import type { Product } from "./ProductCard";
import { ProductDetailSheet } from "./ProductDetailSheet";
import type { ProductFilters } from "./ProductFilters";
import { QuickStockAdjust } from "./QuickStockAdjust";

type ProductsListProps = {
  organizationId: Id<"organization">;
  categoryId: string | null;
  filters: ProductFilters;
  selectionMode?: boolean;
};

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let filtered = [...products];

  // Search filter (name, brand, SKU)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q),
    );
  }

  // Status filter
  if (filters.status !== "all") {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  // Stock level filter
  if (filters.stockLevel === "in_stock") {
    filtered = filtered.filter((p) => p.stockQuantity > 0 && !p.isLowStock);
  } else if (filters.stockLevel === "low_stock") {
    filtered = filtered.filter((p) => p.isLowStock && p.stockQuantity > 0);
  } else if (filters.stockLevel === "out_of_stock") {
    filtered = filtered.filter((p) => p.stockQuantity === 0);
  }

  // Advanced: price range
  if (filters.priceMin !== undefined) {
    const min = filters.priceMin;
    filtered = filtered.filter((p) => p.sellingPrice >= min);
  }
  if (filters.priceMax !== undefined) {
    const max = filters.priceMax;
    filtered = filtered.filter((p) => p.sellingPrice <= max);
  }

  // Advanced: margin range
  if (filters.marginMin !== undefined) {
    const min = filters.marginMin;
    filtered = filtered.filter(
      (p) => p.margin !== undefined && p.margin >= min,
    );
  }
  if (filters.marginMax !== undefined) {
    const max = filters.marginMax;
    filtered = filtered.filter(
      (p) => p.margin !== undefined && p.margin <= max,
    );
  }

  // Advanced: date range
  if (filters.createdAfter) {
    const afterTs = new Date(filters.createdAfter).getTime();
    filtered = filtered.filter(
      (p) => "_creationTime" in p && (p._creationTime as number) >= afterTs,
    );
  }
  if (filters.createdBefore) {
    const beforeTs =
      new Date(filters.createdBefore).getTime() + 24 * 60 * 60 * 1000;
    filtered = filtered.filter(
      (p) => "_creationTime" in p && (p._creationTime as number) < beforeTs,
    );
  }

  // Sort
  if (filters.sort !== "default") {
    switch (filters.sort) {
      case "name_asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name, "tr"));
        break;
      case "name_desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name, "tr"));
        break;
      case "price_asc":
        filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
        break;
      case "price_desc":
        filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
      case "stock_asc":
        filtered.sort((a, b) => a.stockQuantity - b.stockQuantity);
        break;
      case "newest": {
        const getTime = (p: Product) =>
          "_creationTime" in p ? (p._creationTime as number) : 0;
        filtered.sort((a, b) => getTime(b) - getTime(a));
        break;
      }
    }
  }

  return filtered;
}

function isDndEnabled(
  filters: ProductFilters,
  selectionMode?: boolean,
  categoryId?: string | null,
): boolean {
  return (
    !selectionMode &&
    filters.sort === "default" &&
    filters.search === "" &&
    filters.status === "all" &&
    filters.stockLevel === "all" &&
    !categoryId &&
    filters.priceMin === undefined &&
    filters.priceMax === undefined &&
    filters.marginMin === undefined &&
    filters.marginMax === undefined &&
    !filters.createdAfter &&
    !filters.createdBefore
  );
}

function MarginBadge({ margin }: { margin?: number }) {
  if (margin === undefined) return null;
  const color =
    margin >= 50
      ? "text-green-600"
      : margin >= 30
        ? "text-yellow-600"
        : "text-red-600";
  return <span className={`text-xs ${color}`}>{margin}%</span>;
}

function SortableProductRow({
  product,
  isDndActive,
  selectionMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onAdjustStock,
  onViewHistory,
  onDeactivate,
  onDelete,
  onDetail,
  onToggleStatus,
  organizationId,
}: {
  product: Product;
  isDndActive: boolean;
  selectionMode?: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onAdjustStock: () => void;
  onViewHistory: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onToggleStatus: () => void;
  organizationId: Id<"organization">;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product._id, disabled: !isDndActive });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbnail = product.imageUrls?.[0];

  return (
    // biome-ignore lint/a11y/useSemanticElements: complex row layout cannot use button element
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-all cursor-pointer"
      onClick={onDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDetail();
        }
      }}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => {
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
      )}

      {/* Drag handle */}
      {isDndActive && !selectionMode && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: dnd-kit handles keyboard via attributes
        // biome-ignore lint/a11y/noStaticElementInteractions: dnd-kit handles role via attributes
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </span>
      )}

      {/* Thumbnail */}
      <div className="size-10 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={product.name}
            width={40}
            height={40}
            className="size-full object-cover"
          />
        ) : (
          <Package className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Name + Brand */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        {product.brand && (
          <p className="text-xs text-muted-foreground truncate">
            {product.brand}
          </p>
        )}
      </div>

      {/* Category */}
      {product.categoryName && (
        <Badge
          variant="outline"
          className="text-[10px] shrink-0 hidden sm:flex"
        >
          {product.categoryName}
        </Badge>
      )}

      {/* Price + Margin */}
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-sm font-medium">
          {formatPrice(product.sellingPrice)}
        </p>
        <MarginBadge margin={product.margin} />
      </div>

      {/* Quick Stock */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <QuickStockAdjust
          productId={product._id}
          productName={product.name}
          currentStock={product.stockQuantity}
          organizationId={organizationId}
          onOpenFullAdjust={onAdjustStock}
        />
      </div>

      {/* Status badge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus();
        }}
        className="appearance-none border-0 bg-transparent p-0 shrink-0"
      >
        <Badge
          variant={product.status === "active" ? "default" : "destructive"}
          className="cursor-pointer select-none text-[10px]"
        >
          {product.status}
        </Badge>
      </button>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAdjustStock}>
            <Warehouse className="mr-2 size-4" />
            Adjust Stock
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onViewHistory}>
            <History className="mr-2 size-4" />
            View History
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDeactivate}>
            <PackageX className="mr-2 size-4" />
            Deactivate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ProductsList({
  organizationId,
  categoryId,
  filters,
  selectionMode,
}: ProductsListProps) {
  const products = useQuery(api.products.list, {
    organizationId,
    categoryId: categoryId
      ? (categoryId as Id<"productCategories">)
      : undefined,
  }) as Product[] | undefined;

  const deactivateProduct = useMutation(api.products.deactivate);
  const removeProduct = useMutation(api.products.remove);
  const reorderProducts = useMutation(api.products.reorder);
  const updateProduct = useMutation(api.products.update);
  const duplicateProduct = useMutation(api.products.duplicate);

  const [localProducts, setLocalProducts] = useState(products);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<{
    id: Id<"products">;
    name: string;
    stock: number;
  } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{
    id: Id<"products">;
    name: string;
  } | null>(null);
  const [detailTarget, setDetailTarget] = useState<Id<"products"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"products">>>(
    new Set(),
  );

  useEffect(() => {
    if (products) {
      setLocalProducts(products);
    }
  }, [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dndActive = isDndEnabled(filters, selectionMode, categoryId);

  const toggleSelect = (id: Id<"products">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (products === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const displayProducts = localProducts ?? products;
  const filtered = applyFilters(displayProducts, filters);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          {products.length === 0
            ? categoryId
              ? "No products in this category"
              : "No products yet"
            : "No products match your filters"}
        </p>
        {products.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Add Product&quot; to create your first product
          </p>
        )}
      </div>
    );
  }

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      await updateProduct({
        organizationId,
        productId: product._id,
        status: newStatus,
      });
      toast.success(
        newStatus === "active" ? "Product activated" : "Product deactivated",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    }
  };

  const handleDeactivate = async (product: Product) => {
    try {
      await deactivateProduct({ organizationId, productId: product._id });
      toast.success(`${product.name} deactivated`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate product",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeProduct({ organizationId, productId: deleteTarget._id });
      toast.success(`${deleteTarget.name} permanently deleted`);
      if (detailTarget === deleteTarget._id) setDetailTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget._id);
        return next;
      });
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete product",
      );
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await duplicateProduct({ organizationId, productId: product._id });
      toast.success(`${product.name} duplicated`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate product",
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !displayProducts) return;

    const oldIndex = displayProducts.findIndex((p) => p._id === active.id);
    const newIndex = displayProducts.findIndex((p) => p._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = displayProducts;
    const reordered = arrayMove(displayProducts, oldIndex, newIndex);
    setLocalProducts(reordered);
    try {
      await reorderProducts({
        organizationId,
        productIds: reordered.map((p) => p._id),
      });
    } catch {
      setLocalProducts(previous);
      toast.error("Failed to reorder products");
    }
  };

  const handleDeactivateById = async (productId: Id<"products">) => {
    const product = products.find((p) => p._id === productId);
    if (product) await handleDeactivate(product);
  };

  const handleDeleteById = async (productId: Id<"products">) => {
    const product = products.find((p) => p._id === productId);
    if (product) setDeleteTarget(product);
  };

  const listContent = (
    <div className="space-y-2">
      {filtered.map((product) => (
        <SortableProductRow
          key={product._id}
          product={product}
          isDndActive={dndActive}
          selectionMode={selectionMode}
          isSelected={selectedIds.has(product._id)}
          onToggleSelect={() => toggleSelect(product._id)}
          onEdit={() => setEditTarget(product)}
          onDuplicate={() => handleDuplicate(product)}
          onAdjustStock={() =>
            setStockTarget({
              id: product._id,
              name: product.name,
              stock: product.stockQuantity,
            })
          }
          onViewHistory={() =>
            setHistoryTarget({ id: product._id, name: product.name })
          }
          onDeactivate={() => handleDeactivate(product)}
          onDelete={() => setDeleteTarget(product)}
          onDetail={() => setDetailTarget(product._id)}
          onToggleStatus={() => handleToggleStatus(product)}
          organizationId={organizationId}
        />
      ))}
    </div>
  );

  return (
    <>
      {dndActive ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filtered.map((p) => p._id)}
            strategy={verticalListSortingStrategy}
          >
            {listContent}
          </SortableContext>
        </DndContext>
      ) : (
        listContent
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        open={detailTarget !== null}
        onOpenChange={(o) => !o && setDetailTarget(null)}
        productId={detailTarget}
        organizationId={organizationId}
        onEdit={(productId) => {
          const product = products.find((p) => p._id === productId);
          if (product) setEditTarget(product);
        }}
        onAdjustStock={(productId, name, stock) => {
          setStockTarget({ id: productId, name, stock });
        }}
        onDeactivate={handleDeactivateById}
        onDelete={handleDeleteById}
        onViewFullHistory={(productId, name) => {
          setHistoryTarget({ id: productId, name });
        }}
      />

      {/* Edit Product Sheet */}
      <EditProductSheet
        key={editTarget?._id ?? "edit"}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        product={editTarget}
        organizationId={organizationId}
      />

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        open={!!stockTarget}
        onOpenChange={(o) => !o && setStockTarget(null)}
        productId={stockTarget?.id ?? null}
        productName={stockTarget?.name ?? ""}
        currentStock={stockTarget?.stock ?? 0}
        organizationId={organizationId}
      />

      {/* Inventory History Sheet */}
      <InventoryHistorySheet
        open={!!historyTarget}
        onOpenChange={(o) => !o && setHistoryTarget(null)}
        productId={historyTarget?.id ?? null}
        productName={historyTarget?.name ?? ""}
        organizationId={organizationId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This product, its variants, stock history, and price history will
              be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Selection Bar */}
      {selectionMode && (
        <BulkSelectionBar
          selectedIds={[...selectedIds]}
          organizationId={organizationId}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}
    </>
  );
}
