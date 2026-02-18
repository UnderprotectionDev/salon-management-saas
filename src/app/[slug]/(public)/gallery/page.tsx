"use client";

import { useQuery } from "convex/react";
import { ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";

export default function GalleryPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const organization = useQuery(api.organizations.getBySlug, { slug });

  const galleryItems = useQuery(
    api.aiSimulations.listGalleryApproved,
    organization ? { organizationId: organization._id } : "skip",
  );

  // Org loading
  if (organization === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GallerySkeleton />
      </div>
    );
  }

  // Org not found
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

  // Gallery loading
  if (galleryItems === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="font-bold text-2xl tracking-tight">Style Gallery</h2>
          <p className="mt-1 text-muted-foreground">
            See what&apos;s possible at {organization.name}
          </p>
        </div>
        <GallerySkeleton />
      </div>
    );
  }

  // Empty state
  if (galleryItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-semibold text-xl">Style Gallery</h2>
        <p className="text-muted-foreground text-sm">No styles to show yet</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="font-bold text-2xl tracking-tight">Style Gallery</h2>
        <p className="mt-1 text-muted-foreground">
          See what&apos;s possible at {organization.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {galleryItems.map((item) => (
          <Card key={item._id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-square bg-muted">
                {item.resultImageUrl ? (
                  // biome-ignore lint/performance/noImgElement: dynamic storage URL
                  <img
                    src={item.resultImageUrl}
                    alt="Style result"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="space-y-1 p-2">
                {/* Design attribution */}
                {item.designName ? (
                  <p className="truncate font-medium text-xs">
                    {item.designName}
                  </p>
                ) : null}
                {item.staffName ? (
                  <p className="truncate text-muted-foreground text-xs">
                    by {item.staffName}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {item.simulationType === "catalog"
                      ? "Catalog style"
                      : "Custom style"}
                  </p>
                )}
                {/* Try this look link */}
                {item.designCatalogId && organization && (
                  <Link
                    href={`/dashboard/ai?tab=tryon&designId=${item.designCatalogId}&orgId=${organization._id}&salonType=${organization.salonType ?? "hair"}`}
                    className="mt-1 flex items-center gap-1 text-primary text-xs hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    Try this look
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items have no stable id
        <Skeleton key={i} className="aspect-square w-full rounded-lg" />
      ))}
    </div>
  );
}
