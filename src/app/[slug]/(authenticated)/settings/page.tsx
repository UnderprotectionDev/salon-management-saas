"use client";

import { useQuery } from "convex/react";
import { Building2, Clock, Mail, MapPin, Users } from "lucide-react";
import { BusinessHoursEditor } from "@/components/business-hours/BusinessHoursEditor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/modules/organization";
import {
  AddressForm,
  ContactInfoForm,
  GeneralInfoForm,
  InvitationsList,
  MembersList,
} from "@/modules/settings";
import { api } from "../../../../../convex/_generated/api";

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-80" />
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
    </div>
  );
}

export default function SettingsPage() {
  const { activeOrganization } = useOrganization();

  const settings = useQuery(
    api.organizations.getSettings,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  if (!activeOrganization || settings === undefined || settings === null) {
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Mail className="size-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="size-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="size-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="size-4" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* General Information Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                General Information
              </CardTitle>
              <CardDescription>
                Your salon's basic information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralInfoForm organization={activeOrganization} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How customers can reach your salon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactInfoForm
                organizationId={activeOrganization._id}
                settings={settings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                Salon Address
              </CardTitle>
              <CardDescription>Your salon's physical location</CardDescription>
            </CardHeader>
            <CardContent>
              <AddressForm
                organizationId={activeOrganization._id}
                settings={settings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Hours Tab */}
        <TabsContent value="hours">
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
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your salon's team members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembersList organizationId={activeOrganization._id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                Pending and past invitations to join your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationsList organizationId={activeOrganization._id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
