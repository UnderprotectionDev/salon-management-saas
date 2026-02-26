"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import { ProfileCard } from "./ProfileCard";

export function ProfilesSection() {
  const { isAuthenticated } = useConvexAuth();
  const profiles = useQuery(
    api.customerAuth.getMyProfiles,
    isAuthenticated ? {} : "skip",
  );

  if (profiles === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Salon Profiles</CardTitle>
        <CardDescription>
          Manage your customer profiles across salons
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profiles.map((profile) => (
          <ProfileCard key={profile._id} profile={profile} />
        ))}
      </CardContent>
    </Card>
  );
}
