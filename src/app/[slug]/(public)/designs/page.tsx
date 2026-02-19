"use client";

/**
 * Public Design Portfolio Page — /[slug]/designs
 *
 * Shows all active designs from the salon, filterable by staff member.
 * Each design card has a "Try This Look" button that deep-links to
 * /dashboard/ai?tab=tryon&designId=...&orgId=...&salonType=...
 */

import { useQuery } from "convex/react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// Main Page
// =============================================================================

export default function DesignPortfolioPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [selectedStaffId, setSelectedStaffId] = useState<Id<"staff"> | "all">(
    "all",
  );

  const organization = useQuery(api.organizations.getBySlug, { slug });

  const staffList = useQuery(
    api.staff.listNamesForOrg,
    organization ? { organizationId: organization._id } : "skip",
  );

  const designs = useQuery(
    api.designCatalog.listByStaff,
    organization
      ? {
          organizationId: organization._id,
          staffId:
            selectedStaffId !== "all"
              ? (selectedStaffId as Id<"staff">)
              : undefined,
        }
      : "skip",
  );

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (organization === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (organization === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="font-medium text-lg">Salon not found</h2>
          <p className="mt-1 text-muted-foreground">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const orgId = organization._id;
  // Derive effective salonType for try-on URL from multi-select array
  const salonTypeArr = organization.salonType;
  const salonType =
    salonTypeArr && salonTypeArr.length > 0
      ? salonTypeArr.length > 1
        ? "multi"
        : salonTypeArr[0]
      : "hair";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-tight">Design Portfolio</h1>
        <p className="mt-1 text-muted-foreground">
          Browse styles from {organization.name}
        </p>
      </div>

      {/* Staff filter */}
      {staffList && staffList.length > 1 && (
        <div className="mb-6 flex items-center gap-3">
          <span className="whitespace-nowrap text-muted-foreground text-sm">
            Filter by stylist:
          </span>
          <Select
            value={selectedStaffId}
            onValueChange={(v) => setSelectedStaffId(v as Id<"staff"> | "all")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All stylists" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stylists</SelectItem>
              {staffList.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Designs grid */}
      {designs === undefined ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton has no stable id
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : designs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {designs.map((design) => {
            const tryOnUrl = buildTryOnUrl(orgId, design._id, salonType);
            return (
              <DesignCard
                key={design._id}
                design={design}
                tryOnUrl={tryOnUrl}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Design Card
// =============================================================================

function DesignCard({
  design,
  tryOnUrl,
}: {
  design: {
    _id: Id<"designCatalog">;
    name: string;
    category: string;
    description?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    tags: string[];
  };
  tryOnUrl: string;
}) {
  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative aspect-square bg-muted">
          {design.thumbnailUrl || design.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: dynamic storage URL
            <img
              src={design.thumbnailUrl ?? design.imageUrl}
              alt={design.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}

          {/* Hover overlay with Try button */}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <div className="w-full p-3">
              <Button asChild size="sm" className="w-full" variant="secondary">
                <Link href={tryOnUrl}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Try This Look
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="truncate font-medium text-sm">{design.name}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {design.category}
          </p>
          {design.description && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {design.description}
            </p>
          )}
          {design.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {design.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {/* Always-visible Try button (mobile) */}
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link href={tryOnUrl}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Try This Look
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function buildTryOnUrl(
  orgId: Id<"organization">,
  designId: Id<"designCatalog">,
  salonType: string,
): string {
  const params = new URLSearchParams({
    tab: "tryon",
    designId,
    orgId,
    salonType,
  });
  return `/dashboard/ai?${params.toString()}`;
}

// =============================================================================
// Sub-components
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground" />
      <h2 className="font-semibold text-xl">No designs yet</h2>
      <p className="text-muted-foreground text-sm">
        This salon hasn&apos;t uploaded any designs to their portfolio yet.
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <Skeleton key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
