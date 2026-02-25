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
  const deleteService = useMutation(api.services.permanentDelete);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!serviceId) return;
    setIsDeleting(true);
    try {
      await deleteService({ organizationId, serviceId });
      toast.success("Service deleted");
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
          <AlertDialogTitle>Delete Service</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete &ldquo;{serviceName}
            &rdquo;? This action cannot be undone.
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
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
