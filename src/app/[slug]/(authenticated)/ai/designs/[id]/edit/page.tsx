"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { AddDesignPage } from "@/modules/ai/organization/components/design-wizard/AddDesignPage";
import type { DesignSalonType } from "@/modules/ai/organization/components/design-wizard/category-presets";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

export default function EditDesignPage() {
  const params = useParams();
  const designId = params.id as Id<"designCatalog">;
  const { activeOrganization } = useOrganization();

  const designs = useQuery(
    api.designCatalog.listAllByOrg,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  if (!designs) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const design = designs.find((d) => d._id === designId);

  if (!design) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <p className="font-medium text-lg">Design not found</p>
        <p className="text-muted-foreground text-sm">
          The design you are looking for does not exist or has been deleted.
        </p>
      </div>
    );
  }

  return (
    <AddDesignPage
      editMode={{
        designId: design._id,
        initialState: {
          category: design.category,
          serviceArea: (design.salonType === "hair" ||
          design.salonType === "nail" ||
          design.salonType === "makeup"
            ? design.salonType
            : "hair") as DesignSalonType,
          imagePreview: null,
          existingImageUrl: design.thumbnailUrl ?? design.imageUrl ?? null,
          name: design.name,
          description: design.description ?? "",
          tags: design.tags,
        },
      }}
    />
  );
}
