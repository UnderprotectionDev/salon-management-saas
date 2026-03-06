"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "../../../../convex/_generated/api";
import { ProfilesSectionSkeleton } from "./skeletons/ProfilesSectionSkeleton";
import { ProfileCard } from "./ProfileCard";

export function ProfilesSection() {
  const { isAuthenticated } = useConvexAuth();
  const profiles = useQuery(
    api.customerAuth.getMyProfiles,
    isAuthenticated ? {} : "skip",
  );

  if (profiles === undefined) {
    return <ProfilesSectionSkeleton />;
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
