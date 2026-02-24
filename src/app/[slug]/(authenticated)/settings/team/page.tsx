"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { InvitationsList, MembersList } from "@/modules/settings";

export default function TeamSettingsPage() {
  const { activeOrganization } = useOrganization();

  if (!activeOrganization) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their roles
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
    </div>
  );
}
