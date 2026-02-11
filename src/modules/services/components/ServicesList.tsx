"use client";

import { useQuery } from "convex/react";
import { Clock, Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { PriceDisplay } from "./PriceDisplay";
import { DeleteServiceDialog } from "./DeleteServiceDialog";
import { EditServiceDialog } from "./EditServiceDialog";

type ServicesListProps = {
  organizationId: Id<"organization">;
  categoryId: string | null;
  isOwner: boolean;
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

  const [editTarget, setEditTarget] = useState<
    (typeof services extends (infer T)[] | undefined ? T : never) | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"services">;
    name: string;
  } | null>(null);

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

  return (
    <>
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
        <TableBody>
          {services.map((service) => (
            <TableRow key={service._id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {service.description}
                    </p>
                  )}
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
                <PriceDisplay
                  price={service.price}
                  priceType={service.priceType}
                />
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
                      <DropdownMenuItem onClick={() => setEditTarget(service)}>
                        <Edit2 className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      {service.status === "active" && (
                        <DropdownMenuItem
                          onClick={() =>
                            setDeleteTarget({
                              id: service._id,
                              name: service.name,
                            })
                          }
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
          ))}
        </TableBody>
      </Table>

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
