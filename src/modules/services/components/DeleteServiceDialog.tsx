"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
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
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

type DeleteServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: Id<"services"> | null;
  serviceName: string;
  organizationId: Id<"organization">;
};

export function DeleteServiceDialog({
  open,
  onOpenChange,
  serviceId,
  serviceName,
  organizationId,
}: DeleteServiceDialogProps) {
  const removeService = useMutation(api.services.remove);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!serviceId) return;
    setIsDeleting(true);
    try {
      await removeService({ organizationId, serviceId });
      toast.success("Service deactivated");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete service";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Service</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate &ldquo;{serviceName}&rdquo;?
            This service will be hidden from clients and staff, but existing
            bookings will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Deactivate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
