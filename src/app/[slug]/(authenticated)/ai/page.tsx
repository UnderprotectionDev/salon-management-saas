"use client";

import { Palette } from "lucide-react";
import { DesignCatalogManager } from "@/modules/ai/organization/components/DesignCatalogManager";

export default function DesignStudioPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6" />
        <div>
          <h1 className="font-semibold text-2xl">Design Studio</h1>
          <p className="text-muted-foreground text-sm">
            Manage your design catalog
          </p>
        </div>
      </div>

      <DesignCatalogManager />
    </div>
  );
}
