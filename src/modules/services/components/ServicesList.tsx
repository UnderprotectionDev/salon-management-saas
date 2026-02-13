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
  Clock,
  Edit2,
  GripVertical,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeleteServiceDialog } from "./DeleteServiceDialog";
import { EditServiceDialog } from "./EditServiceDialog";
import { PriceDisplay } from "./PriceDisplay";

type ServicesListProps = {
  organizationId: Id<"organization">;
  categoryId: string | null;
  isOwner: boolean;
};

type ServiceItem = {
  _id: Id<"services">;
  name: string;
  description?: string;
  categoryName?: string;
  duration: number;
  price: number;
  priceType: "fixed" | "starting_from" | "variable";
  status: "active" | "inactive";
  [key: string]: unknown;
};

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "inactive":
      return "destructive";
    default:
      return "outline";
  }
}

function SortableServiceRow({
  service,
  isOwner,
  onEdit,
  onDelete,
}: {
  service: ServiceItem;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2 min-w-0">
          {isOwner && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab shrink-0 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{service.name}</p>
            {service.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {service.categoryName ? (
          <Badge variant="outline">{service.categoryName}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1 text-sm">
          <Clock className="size-3 text-muted-foreground" />
          {service.duration}m
        </span>
      </TableCell>
      <TableCell className="text-sm">
        <PriceDisplay price={service.price} priceType={service.priceType} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant={getStatusBadgeVariant(service.status)}>
          {service.status}
        </Badge>
      </TableCell>
      {isOwner && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              {service.status === "active" && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

export function ServicesList({
  organizationId,
  categoryId,
  isOwner,
}: ServicesListProps) {
  const services = useQuery(api.services.list, {
    organizationId,
    categoryId: categoryId
      ? (categoryId as Id<"serviceCategories">)
      : undefined,
  });
  const reorderServices = useMutation(api.services.reorder);

  // Local state for optimistic drag-and-drop reordering
  const [localServices, setLocalServices] = useState(services);
  useEffect(() => {
    if (services) {
      setLocalServices(services);
    }
  }, [services]);

  const [editTarget, setEditTarget] = useState<
    (typeof services extends (infer T)[] | undefined ? T : never) | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"services">;
    name: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (services === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          {categoryId ? "No services in this category" : "No services yet"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isOwner
            ? 'Click "Add Service" to create your first service'
            : "Your admin will add services soon"}
        </p>
      </div>
    );
  }

  const displayServices = localServices ?? services;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !displayServices) return;

    const oldIndex = displayServices.findIndex((s) => s._id === active.id);
    const newIndex = displayServices.findIndex((s) => s._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = displayServices;
    const reordered = arrayMove(displayServices, oldIndex, newIndex);
    setLocalServices(reordered);
    try {
      await reorderServices({
        organizationId,
        serviceIds: reordered.map((s) => s._id),
      });
    } catch {
      setLocalServices(previous);
      toast.error("Failed to reorder services");
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              {isOwner && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <SortableContext
            items={displayServices.map((s) => s._id)}
            strategy={verticalListSortingStrategy}
          >
            <TableBody>
              {displayServices.map((service) => (
                <SortableServiceRow
                  key={service._id}
                  service={service}
                  isOwner={isOwner}
                  onEdit={() => setEditTarget(service)}
                  onDelete={() =>
                    setDeleteTarget({
                      id: service._id,
                      name: service.name,
                    })
                  }
                />
              ))}
            </TableBody>
          </SortableContext>
        </Table>
      </DndContext>

      {/* Edit Dialog */}
      <EditServiceDialog
        key={editTarget?._id}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        service={editTarget}
        organizationId={organizationId}
      />

      {/* Delete Dialog */}
      <DeleteServiceDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        serviceId={deleteTarget?.id ?? null}
        serviceName={deleteTarget?.name ?? ""}
        organizationId={organizationId}
      />
    </>
  );
}
