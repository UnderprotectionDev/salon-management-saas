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
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { stripHtml } from "@/lib/html";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DeleteServiceDialog } from "./DeleteServiceDialog";
import { EditServiceSheet } from "./EditServiceSheet";
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

type StaffInfo = {
  _id: Id<"staff">;
  name: string;
  imageUrl?: string | null;
  serviceIds?: Id<"services">[];
  status: string;
};

function StaffAvatarStack({
  serviceId,
  allStaff,
  avatarConfigMap,
}: {
  serviceId: Id<"services">;
  allStaff: StaffInfo[];
  avatarConfigMap: Map<Id<"staff">, Record<string, unknown> | null>;
}) {
  const assignedStaff = allStaff.filter(
    (s) => s.status === "active" && s.serviceIds?.includes(serviceId),
  );

  if (assignedStaff.length === 0) return null;

  const displayed = assignedStaff.slice(0, 3);
  const remaining = assignedStaff.length - 3;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {displayed.map((staff) => {
          const config = avatarConfigMap.get(staff._id);
          return (
            <Avatar
              key={staff._id}
              className="size-5 border-2 border-background"
            >
              <AvatarImage src={staff.imageUrl ?? undefined} />
              <AvatarFallback className="text-[8px]">
                <NiceAvatar
                  style={{ width: "100%", height: "100%" }}
                  shape="circle"
                  {...(config ?? genConfig(staff._id))}
                />
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">
        {assignedStaff.length} staff
        {remaining > 0 && ` (+${remaining})`}
      </span>
    </div>
  );
}

function SortableServiceCard({
  service,
  isOwner,
  allStaff,
  avatarConfigMap,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  service: ServiceItem;
  isOwner: boolean;
  allStaff: StaffInfo[];
  avatarConfigMap: Map<Id<"staff">, Record<string, unknown> | null>;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
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
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border bg-card p-4 hover:shadow-sm transition-all"
    >
      {/* Row 1: Name + Duration */}
      <div className="flex items-center gap-2">
        {isOwner && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="size-4" />
          </span>
        )}
        <p className="text-sm font-semibold truncate flex-1">{service.name}</p>
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="size-3" />
          {service.duration}m
        </span>
      </div>

      {/* Row 2: Description + Category + Price */}
      <div className="flex items-center gap-2 mt-1.5">
        {isOwner && <div className="w-4 shrink-0" />}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {service.description ? (
            <p className="text-xs text-muted-foreground truncate">
              {stripHtml(service.description)}
            </p>
          ) : (
            <span />
          )}
          {service.categoryName && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {service.categoryName}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium shrink-0">
          <PriceDisplay price={service.price} priceType={service.priceType} />
        </span>
      </div>

      {/* Row 3: Staff Avatars + Status + Actions */}
      <div className="flex items-center gap-2 mt-2">
        {isOwner && <div className="w-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <StaffAvatarStack
            serviceId={service._id}
            allStaff={allStaff}
            avatarConfigMap={avatarConfigMap}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner ? (
            <button
              type="button"
              onClick={onToggleStatus}
              className="appearance-none border-0 bg-transparent p-0"
              aria-label={`Toggle status: currently ${service.status}`}
            >
              <Badge
                variant={
                  service.status === "active" ? "default" : "destructive"
                }
                className="cursor-pointer select-none text-[10px]"
              >
                {service.status}
              </Badge>
            </button>
          ) : (
            <Badge
              variant={service.status === "active" ? "default" : "destructive"}
              className="text-[10px]"
            >
              {service.status}
            </Badge>
          )}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
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
  const allStaff = useQuery(api.staff.list, { organizationId });
  const avatarConfigs = useQuery(api.staff.getAvatarConfigs, {
    organizationId,
  });
  const reorderServices = useMutation(api.services.reorder);
  const updateService = useMutation(api.services.update);

  const avatarConfigMap = new Map(
    avatarConfigs?.map((a) => [a.staffId, a.avatarConfig]) ?? [],
  ) as Map<Id<"staff">, Record<string, unknown> | null>;

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

  if (services === undefined || allStaff === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
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
  const staffList = (allStaff ?? []) as StaffInfo[];

  const handleToggleStatus = async (
    serviceId: Id<"services">,
    currentStatus: "active" | "inactive",
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateService({ organizationId, serviceId, status: newStatus });
      toast.success(
        newStatus === "active" ? "Service activated" : "Service deactivated",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update service status";
      toast.error(message);
    }
  };

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
        <SortableContext
          items={displayServices.map((s) => s._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {displayServices.map((service) => (
              <SortableServiceCard
                key={service._id}
                service={service}
                isOwner={isOwner}
                allStaff={staffList}
                avatarConfigMap={avatarConfigMap}
                onEdit={() => setEditTarget(service)}
                onDelete={() =>
                  setDeleteTarget({
                    id: service._id,
                    name: service.name,
                  })
                }
                onToggleStatus={() =>
                  handleToggleStatus(service._id, service.status)
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Edit Sheet */}
      <EditServiceSheet
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
