"use client";

import type { useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { api } from "../../../../convex/_generated/api";

type ProfileData = NonNullable<
  ReturnType<typeof useQuery<typeof api.userProfile.get>>
>;

export function ConsentSection({
  profile,
}: {
  profile: NonNullable<ProfileData>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="size-4" />
          Data Processing Consent
        </CardTitle>
        <CardDescription>
          Manage your personal data processing consents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              Data Processing Consent
            </Label>
            <p className="text-xs text-muted-foreground">
              Processing your personal data for service delivery
            </p>
          </div>
          <Badge
            variant={profile.dataProcessingConsent ? "default" : "destructive"}
          >
            {profile.dataProcessingConsent ? "Accepted" : "Required"}
          </Badge>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Marketing Consent</Label>
            <p className="text-xs text-muted-foreground">
              Promotional and notification emails
            </p>
          </div>
          <Badge variant={profile.marketingConsent ? "default" : "secondary"}>
            {profile.marketingConsent ? "Accepted" : "Not Accepted"}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          Your rights are reserved under data protection laws. For questions
          about your consents, please review our{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
