"use client";

import { Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DesignCatalogManager } from "@/modules/ai/organization/components/DesignCatalogManager";
import { GalleryModerationView } from "@/modules/ai/organization/components/GalleryModerationView";
import { OrgAICreditManager } from "@/modules/ai/organization/components/OrgAICreditManager";
import { useOrganization } from "@/modules/organization";

export default function DesignStudioPage() {
  const { activeOrganization, currentRole } = useOrganization();

  if (!activeOrganization) return null;

  const isOwner = currentRole === "owner";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6" />
        <div>
          <h1 className="font-semibold text-2xl">Design Studio</h1>
          <p className="text-muted-foreground text-sm">
            Manage design catalog, gallery, and AI credits
          </p>
        </div>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Design Catalog</TabsTrigger>
          {isOwner && <TabsTrigger value="gallery">Gallery</TabsTrigger>}
          {isOwner && <TabsTrigger value="credits">Credits</TabsTrigger>}
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <DesignCatalogManager />
        </TabsContent>

        {isOwner && (
          <TabsContent value="gallery" className="mt-4">
            <GalleryModerationView />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="credits" className="mt-4">
            <OrgAICreditManager organizationId={activeOrganization._id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
