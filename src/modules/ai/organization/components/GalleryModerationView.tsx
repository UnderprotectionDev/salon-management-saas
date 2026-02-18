"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { CheckCircle2, ImageIcon, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function GalleryModerationView() {
  const { activeOrganization } = useOrganization();

  const pendingItems = useQuery(
    api.aiSimulations.listGalleryPending,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  // Image URL resolution
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  // Track attempted IDs to prevent infinite re-render loop when some URLs fail
  const attemptedIds = useRef<Set<string>>(new Set());
  const getFileUrl = useMutation(api.files.getFileUrl);
  const approveItem = useMutation(api.aiSimulations.approveGalleryItem);
  const rejectItem = useMutation(api.aiSimulations.rejectGalleryItem);
  // Track which item is being approved/rejected
  const [loadingId, setLoadingId] = useState<Id<"aiSimulations"> | null>(null);

  useEffect(() => {
    if (!pendingItems || pendingItems.length === 0) return;

    const storageIds = pendingItems.flatMap((item) => {
      const ids: Id<"_storage">[] = [item.imageStorageId];
      if (item.resultImageStorageId) {
        ids.push(item.resultImageStorageId);
      }
      return ids;
    });

    // Skip IDs already attempted (resolved or failed) — prevents infinite loop
    const pendingIds = storageIds.filter(
      (id) => !attemptedIds.current.has(id as string),
    );
    if (pendingIds.length === 0) return;

    for (const id of pendingIds) {
      attemptedIds.current.add(id as string);
    }

    let cancelled = false;

    async function resolveUrls() {
      const newUrls: Record<string, string> = {};
      for (const storageId of pendingIds) {
        try {
          const url = await getFileUrl({ storageId });
          if (url && !cancelled) {
            newUrls[storageId as string] = url;
          }
        } catch {
          // Silently skip failed URL resolutions
        }
      }
      if (!cancelled && Object.keys(newUrls).length > 0) {
        setImageUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }

    resolveUrls();
    return () => {
      cancelled = true;
    };
  }, [pendingItems, getFileUrl]);

  if (!activeOrganization) return null;

  // Loading state
  if (pendingItems === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg">Gallery Moderation</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (pendingItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed py-20">
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
        <h3 className="font-medium text-lg">Gallery Moderation</h3>
        <p className="text-muted-foreground text-sm">No pending submissions</p>
      </div>
    );
  }

  async function handleApprove(simulationId: Id<"aiSimulations">) {
    if (!activeOrganization || loadingId) return;
    setLoadingId(simulationId);
    try {
      await approveItem({
        organizationId: activeOrganization._id,
        simulationId,
      });
      toast.success("Submission approved");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string }).message ?? "Error")
          : "Failed to approve submission",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(simulationId: Id<"aiSimulations">) {
    if (!activeOrganization || loadingId) return;
    setLoadingId(simulationId);
    try {
      await rejectItem({
        organizationId: activeOrganization._id,
        simulationId,
      });
      toast.success("Submission rejected");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string }).message ?? "Error")
          : "Failed to reject submission",
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Gallery Moderation</h3>
        <p className="text-muted-foreground text-sm">
          {pendingItems.length} pending{" "}
          {pendingItems.length === 1 ? "submission" : "submissions"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingItems.map((item) => {
          const beforeUrl = imageUrls[item.imageStorageId as string];
          const afterUrl = item.resultImageStorageId
            ? imageUrls[item.resultImageStorageId as string]
            : undefined;

          return (
            <Card key={item._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-2">
                  <div className="relative aspect-square bg-muted">
                    {beforeUrl ? (
                      // biome-ignore lint/performance/noImgElement: dynamic storage URL
                      <img
                        src={beforeUrl}
                        alt="Before"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-white text-xs">
                      Before
                    </span>
                  </div>
                  <div className="relative aspect-square bg-muted">
                    {afterUrl ? (
                      // biome-ignore lint/performance/noImgElement: dynamic storage URL
                      <img
                        src={afterUrl}
                        alt="After"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-white text-xs">
                      After
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-3">
                  <p className="text-muted-foreground text-xs">
                    {item.simulationType === "catalog"
                      ? "Catalog try-on"
                      : "Prompt try-on"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      disabled={!!loadingId}
                      onClick={() => handleApprove(item._id)}
                    >
                      {loadingId === item._id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={!!loadingId}
                      onClick={() => handleReject(item._id)}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
