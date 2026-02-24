"use client";

import { useQuery } from "convex/react";
import { BusinessHoursEditor } from "@/components/business-hours/BusinessHoursEditor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../../convex/_generated/api";

export default function HoursSettingsPage() {
  const { activeOrganization } = useOrganization();

  const settings = useQuery(
    api.organizations.getSettings,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  if (!activeOrganization || !settings) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>
          Set your operating hours for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BusinessHoursEditor
          organizationId={activeOrganization._id}
          initialHours={settings.businessHours}
        />
      </CardContent>
    </Card>
  );
}
