"use client";

import { useMutation, useQuery } from "convex/react";
import { ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

interface AppointmentPrepViewProps {
  organizationId: Id<"organization">;
  customerId: Id<"customers">;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Staff-facing AI prep view: displays customer's analysis summary,
 * mood board, recent try-ons. Read-only, zero credit cost.
 */
export function AppointmentPrepView({
  organizationId,
  customerId,
}: AppointmentPrepViewProps) {
  // Look up the customer to get their userId
  const customer = useQuery(api.customers.get, { organizationId, customerId });
  const customerUserId = customer?.userId ?? null;

  // Latest analysis for this customer (by userId)
  const analyses = useQuery(
    api.aiAnalysis.listByUser,
    customerUserId ? { userId: customerUserId, limit: 1 } : "skip",
  );
  const latestAnalysis = analyses?.[0] ?? null;

  // Recent try-on results (by userId)
  const tryOns = useQuery(
    api.aiSimulations.listByUser,
    customerUserId ? { userId: customerUserId, limit: 5 } : "skip",
  );

  // Resolve storage IDs to URLs for images.
  // attemptedIds tracks every ID we've tried (success or failure) so that
  // a failed getFileUrl call doesn't cause an infinite re-render loop.
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const attemptedIds = useRef<Set<string>>(new Set());
  const getFileUrl = useMutation(api.files.getFileUrl);

  useEffect(() => {
    const storageIds: Id<"_storage">[] = [];

    if (tryOns) {
      for (const item of tryOns) {
        if (item.resultImageStorageId) {
          storageIds.push(item.resultImageStorageId);
        }
      }
    }

    // Skip IDs already attempted (resolved or failed) — prevents infinite loop
    const pendingIds = storageIds.filter(
      (id) => !attemptedIds.current.has(id as string),
    );
    if (pendingIds.length === 0) return;

    // Mark as attempted before async work to prevent concurrent duplicate fetches
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
          // Failed IDs already tracked in attemptedIds — won't be retried
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
  }, [tryOns, getFileUrl]); // imageUrls removed — attemptedIds ref handles dedup

  // Customer loaded but has no linked user account → queries are permanently skipped
  if (customer !== undefined && customerUserId === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No AI data available for this customer
        </p>
      </div>
    );
  }

  // All loading
  if (analyses === undefined || tryOns === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  // No AI data at all
  const hasAnyData = latestAnalysis !== null || (tryOns && tryOns.length > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No AI data available for this customer
        </p>
      </div>
    );
  }

  // Parse analysis result
  const analysisResult = latestAnalysis?.result as
    | {
        features?: Array<{
          name: string;
          value: string;
          description: string;
        }>;
        summary?: string;
        careTips?: Array<{ title: string; description: string }>;
      }
    | undefined;

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
      {/* Analysis Summary */}
      {latestAnalysis && analysisResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysisResult.summary && (
              <p className="text-muted-foreground text-xs">
                {analysisResult.summary}
              </p>
            )}
            {analysisResult.features && analysisResult.features.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {analysisResult.features
                  .slice(0, 6)
                  .map((f: { name: string; value: string }, i: number) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-muted-foreground">{f.name}:</span>
                      <span className="font-medium">{f.value}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Try-Ons */}
      {tryOns && tryOns.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Recent Try-Ons ({tryOns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {tryOns.map((item) => {
                  const url = item.resultImageStorageId
                    ? imageUrls[item.resultImageStorageId as string]
                    : undefined;
                  return (
                    <div
                      key={item._id}
                      className="relative aspect-square overflow-hidden rounded-md bg-muted"
                    >
                      {url ? (
                        // biome-ignore lint/performance/noImgElement: dynamic storage URL
                        <img
                          src={url}
                          alt="Try-on result"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5">
                        <p className="text-white text-[10px]">
                          {item.simulationType === "catalog"
                            ? "Catalog"
                            : "Custom"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
