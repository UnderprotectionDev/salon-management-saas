"use client";

import { useMutation, type useQuery } from "convex/react";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GENDER_OPTIONS } from "@/modules/onboarding";
import { api } from "../../../../convex/_generated/api";

// Date of birth max: 13 years ago (local date)
const now = new Date();
const MAX_DOB = `${now.getFullYear() - 13}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

type ProfileData = NonNullable<
  ReturnType<typeof useQuery<typeof api.userProfile.get>>
>;

export function ProfileSection({
  profile,
}: {
  profile: NonNullable<ProfileData>;
}) {
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gender, setGender] = useState(profile.gender ?? null);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        gender: (gender as "male" | "female" | "unspecified") ?? undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal Information</CardTitle>
        <CardDescription>
          To personalize your booking experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone (read-only if set from booking) */}
        {profile.phone && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Phone</Label>
            <p className="text-sm font-medium">{profile.phone}</p>
            <p className="text-xs text-muted-foreground">
              Automatically saved from bookings
            </p>
          </div>
        )}

        {/* Gender */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Gender</Label>
          <div className="flex gap-2 flex-wrap">
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={gender === option.id}
                onClick={() => setGender(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  gender === option.id &&
                    "border-primary bg-primary/5 font-medium",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="settings-dob" className="text-sm font-medium">
            Date of Birth
          </Label>
          <Input
            id="settings-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={MAX_DOB}
            min="1920-01-01"
            className="max-w-48"
          />
        </div>

        <Button onClick={handleSave} disabled={isSubmitting} type="button">
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
