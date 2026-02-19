"use client";

import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarCheck,
  Camera,
  Heart,
  Sparkles,
} from "lucide-react";
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
import { authClient } from "@/lib/auth-client";
import { CreditBalance } from "@/modules/ai/components/CreditBalance";
import { type SalonType, TRYON_ENABLED_TYPES } from "@/modules/ai/constants";
import { AIFeatureCard } from "@/modules/ai/customer/components/AIFeatureCard";
import { AIHubSummaryCards } from "@/modules/ai/customer/components/AIHubSummaryCards";
import { AIRecentActivity } from "@/modules/ai/customer/components/AIRecentActivity";
import { CareScheduleView } from "@/modules/ai/customer/components/CareScheduleView";
import { MoodBoardView } from "@/modules/ai/customer/components/MoodBoardView";
import { PhotoAnalysisView } from "@/modules/ai/customer/components/PhotoAnalysisView";
import { VirtualTryOnView } from "@/modules/ai/customer/components/VirtualTryOnView";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

type Section = "analysis" | "tryon" | "styles" | "schedule" | null;

const SALON_TYPE_LABELS: Record<SalonType, string> = {
  hair: "Hair Salon",
  nail: "Nail Salon",
  makeup: "Makeup / Beauty",
  barber: "Barber",
  spa: "Spa & Wellness",
  multi: "Multi-Service",
};

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
  const queryTab = searchParams.get("tab");
  const querySalonType = searchParams.get("salonType") as SalonType | null;

  const [salonType, setSalonType] = useState<SalonType>(
    querySalonType && SALON_TYPE_LABELS[querySalonType]
      ? querySalonType
      : "hair",
  );

  // Resolve initial section from query params
  const initialSection = (() => {
    if (!queryTab) return null;
    if (
      queryTab === "tryon" &&
      TRYON_ENABLED_TYPES.has(querySalonType ?? "hair")
    )
      return "tryon" as Section;
    if (queryTab === "analysis") return "analysis" as Section;
    if (queryTab === "styles") return "styles" as Section;
    if (queryTab === "schedule") return "schedule" as Section;
    return null;
  })();

  const [activeSection, setActiveSection] = useState<Section>(initialSection);

  const showTryOn = TRYON_ENABLED_TYPES.has(salonType);

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const creditBalance = useQuery(
    api.aiCredits.getMyBalance,
    isAuthenticated ? {} : "skip",
  );

  function handleSalonTypeChange(v: string) {
    const newType = v as SalonType;
    setSalonType(newType);
    if (activeSection === "tryon" && !TRYON_ENABLED_TYPES.has(newType)) {
      setActiveSection("analysis");
    }
  }

  function handleSelectSection(section: Section) {
    if (section === "tryon" && !showTryOn) return;
    setActiveSection((prev) => (prev === section ? null : section));
  }

  function handleRecentActivitySelect(type: "analysis" | "tryon", _id: string) {
    if (type === "tryon" && !showTryOn) {
      setActiveSection("analysis");
      return;
    }
    setActiveSection(type === "analysis" ? "analysis" : "tryon");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          {/* Right side: salon type + credit balance */}
          <div className="flex items-center gap-3">
            <Select value={salonType} onValueChange={handleSalonTypeChange}>
              <SelectTrigger className="w-44">
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

            {creditBalance !== undefined && (
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <span className="text-muted-foreground text-sm">Credits:</span>
                <span className="font-semibold text-sm tabular-nums">
                  {creditBalance.balance}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <AIHubSummaryCards
          salonType={salonType}
          onSelectSection={handleSelectSection}
        />

        {/* Recent Activity */}
        <AIRecentActivity onSelectItem={handleRecentActivitySelect} />

        {/* Feature Card Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AIFeatureCard
            icon={Camera}
            title="Photo Analysis"
            description="Analyze your look with AI"
            active={activeSection === "analysis"}
            accentColor="violet"
            onClick={() => handleSelectSection("analysis")}
          />
          <AIFeatureCard
            icon={Sparkles}
            title="Virtual Try-On"
            description="Try new styles virtually"
            active={activeSection === "tryon"}
            disabled={!showTryOn}
            accentColor="amber"
            onClick={() => handleSelectSection("tryon")}
          />
          <AIFeatureCard
            icon={Heart}
            title="My Styles"
            description="Your saved mood board"
            active={activeSection === "styles"}
            accentColor="rose"
            onClick={() => handleSelectSection("styles")}
          />
          <AIFeatureCard
            icon={CalendarCheck}
            title="Care Schedule"
            description="Personalized care plan"
            active={activeSection === "schedule"}
            accentColor="emerald"
            onClick={() => handleSelectSection("schedule")}
          />
        </div>

        {/* Expanded Feature Panel */}
        {activeSection === "analysis" && (
          <PhotoAnalysisView
            salonType={salonType}
            onNavigateToTryOn={
              showTryOn ? () => setActiveSection("tryon") : undefined
            }
          />
        )}

        {activeSection === "tryon" && showTryOn && (
          <VirtualTryOnView
            salonType={salonType as "hair" | "nail" | "makeup" | "multi"}
            initialDesignId={queryDesignId}
            initialOrganizationId={queryOrgId}
            onNavigateToMoodBoard={() => setActiveSection("styles")}
          />
        )}

        {activeSection === "styles" && (
          <MoodBoardView
            onNavigateToTryOn={
              showTryOn ? () => setActiveSection("tryon") : undefined
            }
          />
        )}

        {activeSection === "schedule" && (
          <CareScheduleView salonType={salonType} />
        )}

        {/* Full Credit Management (when no section active, show at bottom) */}
        {activeSection === null && <CreditBalance />}
      </div>
    </div>
  );
}
