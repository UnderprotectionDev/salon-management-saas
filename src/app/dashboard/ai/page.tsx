"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditBalance } from "@/modules/ai/components/CreditBalance";
import { CareScheduleView } from "@/modules/ai/customer/components/CareScheduleView";
import { MoodBoardView } from "@/modules/ai/customer/components/MoodBoardView";
import { PhotoAnalysisView } from "@/modules/ai/customer/components/PhotoAnalysisView";
import { VirtualTryOnView } from "@/modules/ai/customer/components/VirtualTryOnView";
import type { Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";
type TryOnSalonType = "hair" | "nail" | "makeup" | "multi";

const SALON_TYPE_LABELS: Record<SalonType, string> = {
  hair: "Hair Salon",
  nail: "Nail Salon",
  makeup: "Makeup / Beauty",
  barber: "Barber",
  spa: "Spa & Wellness",
  multi: "Multi-Service",
};

const TRYON_ENABLED_TYPES = new Set<SalonType>([
  "hair",
  "nail",
  "makeup",
  "multi",
]);

// =============================================================================
// Main Page
// =============================================================================

export default function DashboardAIPage() {
  const searchParams = useSearchParams();

  // Deep-link support: ?tab=tryon&designId=...&orgId=...&salonType=hair
  const queryDesignId = searchParams.get(
    "designId",
  ) as Id<"designCatalog"> | null;
  const queryOrgId = searchParams.get("orgId") as Id<"organization"> | null;
  const queryTab = searchParams.get("tab") ?? "analysis";
  const querySalonType = searchParams.get("salonType") as SalonType | null;

  const [salonType, setSalonType] = useState<SalonType>(
    querySalonType && SALON_TYPE_LABELS[querySalonType]
      ? querySalonType
      : "hair",
  );
  const [activeTab, setActiveTab] = useState<string>(
    queryTab === "tryon" && TRYON_ENABLED_TYPES.has(querySalonType ?? ("hair" as SalonType))
      ? "tryon"
      : "analysis",
  );

  const showTryOn = TRYON_ENABLED_TYPES.has(salonType);

  function handleSalonTypeChange(v: string) {
    const newType = v as SalonType;
    setSalonType(newType);
    // If tryon tab is active but new type doesn't support it, fall back to analysis
    if (activeTab === "tryon" && !TRYON_ENABLED_TYPES.has(newType)) {
      setActiveTab("analysis");
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Sparkles className="size-6" />
          <div>
            <h1 className="font-semibold text-2xl">AI Features</h1>
            <p className="text-muted-foreground text-sm">
              Photo analysis, virtual try-on, care schedule and more
            </p>
          </div>
        </div>

        {/* Salon type selector */}
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap font-medium text-muted-foreground text-sm">
            Salon type:
          </span>
          <Select
            value={salonType}
            onValueChange={handleSalonTypeChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SALON_TYPE_LABELS) as SalonType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {SALON_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* AI Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="analysis">Photo Analysis</TabsTrigger>
            {showTryOn && <TabsTrigger value="tryon">Try On</TabsTrigger>}
            <TabsTrigger value="styles">My Styles</TabsTrigger>
            <TabsTrigger value="schedule">Care Schedule</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4">
            <PhotoAnalysisView salonType={salonType} />
          </TabsContent>

          {showTryOn && (
            <TabsContent value="tryon" className="mt-4">
              <VirtualTryOnView
                salonType={salonType as TryOnSalonType}
                initialDesignId={queryDesignId}
                initialOrganizationId={queryOrgId}
              />
            </TabsContent>
          )}

          <TabsContent value="styles" className="mt-4">
            <MoodBoardView />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <CareScheduleView salonType={salonType} />
          </TabsContent>

          <TabsContent value="credits" className="mt-4">
            <CreditBalance />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
