"use client";

import { useQuery } from "convex/react";
import { Building2, Clock, Globe, Mail, Phone } from "lucide-react";
import { BusinessHoursEditor } from "@/components/business-hours/BusinessHoursEditor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { activeOrganization } = useOrganization();

  const settings = useQuery(
    api.organizations.getSettings,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  if (!activeOrganization || settings === undefined) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your salon's settings and preferences
        </p>
      </div>

      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            General Information
          </CardTitle>
          <CardDescription>Your salon's basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                Salon Name
              </span>
              <p className="text-sm font-medium">{activeOrganization.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">
                URL Slug
              </span>
              <p className="text-sm font-medium">/{activeOrganization.slug}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {settings?.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <span className="text-sm">{settings.email}</span>
              </div>
            )}
            {settings?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <span className="text-sm">{settings.phone}</span>
              </div>
            )}
            {settings?.website && (
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <span className="text-sm">{settings.website}</span>
              </div>
            )}
            {!settings?.email && !settings?.phone && !settings?.website && (
              <p className="text-sm text-muted-foreground col-span-full">
                No contact information configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Business Hours
          </CardTitle>
          <CardDescription>
            Set your salon's operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessHoursEditor
            organizationId={activeOrganization._id}
            initialHours={settings?.businessHours}
          />
        </CardContent>
      </Card>
    </div>
  );
}
