"use client";

import type { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArtPreferencesForm } from "@/modules/settings/components/preferences/ArtPreferencesForm";
import { BodyPreferencesForm } from "@/modules/settings/components/preferences/BodyPreferencesForm";
import { HairPreferencesForm } from "@/modules/settings/components/preferences/HairPreferencesForm";
import { MedicalPreferencesForm } from "@/modules/settings/components/preferences/MedicalPreferencesForm";
import { NailsPreferencesForm } from "@/modules/settings/components/preferences/NailsPreferencesForm";
import { SkinPreferencesForm } from "@/modules/settings/components/preferences/SkinPreferencesForm";
import { SpaPreferencesForm } from "@/modules/settings/components/preferences/SpaPreferencesForm";
import { SpecialtyPreferencesForm } from "@/modules/settings/components/preferences/SpecialtyPreferencesForm";
import { SalonCategorySelector } from "@/modules/settings/components/SalonCategorySelector";
import { USER_SALON_CATEGORIES } from "@/modules/settings/lib/salon-preferences-constants";
import type { api } from "../../../../convex/_generated/api";

type ProfileData = NonNullable<
  ReturnType<typeof useQuery<typeof api.userProfile.get>>
>;

function CategoryForm({
  category,
  data,
}: {
  category: string;
  data?: Record<string, unknown>;
}) {
  switch (category) {
    case "hair":
      return (
        <HairPreferencesForm
          data={data as Parameters<typeof HairPreferencesForm>[0]["data"]}
        />
      );
    case "nails":
      return (
        <NailsPreferencesForm
          data={data as Parameters<typeof NailsPreferencesForm>[0]["data"]}
        />
      );
    case "skin":
      return (
        <SkinPreferencesForm
          data={data as Parameters<typeof SkinPreferencesForm>[0]["data"]}
        />
      );
    case "spa":
      return (
        <SpaPreferencesForm
          data={data as Parameters<typeof SpaPreferencesForm>[0]["data"]}
        />
      );
    case "body":
      return (
        <BodyPreferencesForm
          data={data as Parameters<typeof BodyPreferencesForm>[0]["data"]}
        />
      );
    case "medical":
      return (
        <MedicalPreferencesForm
          data={data as Parameters<typeof MedicalPreferencesForm>[0]["data"]}
        />
      );
    case "art":
      return (
        <ArtPreferencesForm
          data={data as Parameters<typeof ArtPreferencesForm>[0]["data"]}
        />
      );
    case "specialty":
      return (
        <SpecialtyPreferencesForm
          data={data as Parameters<typeof SpecialtyPreferencesForm>[0]["data"]}
        />
      );
    default:
      return null;
  }
}

export function SalonPreferencesSection({
  profile,
}: {
  profile: NonNullable<ProfileData>;
}) {
  const prefs = profile.salonPreferences;
  const selectedCategories: string[] = prefs?.selectedCategories ?? [];

  const activeCategories = USER_SALON_CATEGORIES.filter((cat) =>
    selectedCategories.includes(cat.key),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4" />
            Salon Categories
          </CardTitle>
          <CardDescription>
            Select the services you&apos;re interested in to see relevant
            preference options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SalonCategorySelector selectedCategories={selectedCategories} />
        </CardContent>
      </Card>

      {activeCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Preferences</CardTitle>
            <CardDescription>
              Customize your preferences for each selected category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible>
              {activeCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <AccordionItem key={cat.key} value={cat.key}>
                    <AccordionTrigger className="px-6">
                      <span className="flex items-center gap-2 text-sm">
                        <Icon className="size-4" />
                        {cat.label}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                      <CategoryForm
                        category={cat.prefsKey}
                        data={prefs?.[cat.prefsKey]}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </>
  );
}
