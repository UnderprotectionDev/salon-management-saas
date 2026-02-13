"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  Loader2,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  COMMON_ALLERGENS,
  GENDER_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  HAIR_TYPE_OPTIONS,
} from "@/modules/onboarding";
import { api } from "../../../convex/_generated/api";

export default function UserSettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const profile = useQuery(api.userProfile.get, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (user === null) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  if (user === undefined || profile === undefined) {
    return <SettingsSkeleton />;
  }

  if (user === null) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-2xl p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Profile Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
        </div>

        {/* Account Info (read-only from Google) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" />
              Account Information
            </CardTitle>
            <CardDescription>
              Information from your Google account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span>{user.name || "Not specified"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info (editable) */}
        {profile && <ProfileSection profile={profile} />}

        {/* Notification Preferences */}
        {profile && <NotificationSection profile={profile} />}

        {/* KVKK Consent Management */}
        {profile && <ConsentSection profile={profile} />}
      </div>
    </div>
  );
}

// =============================================================================
// Profile Section
// =============================================================================

type ProfileData = NonNullable<
  ReturnType<typeof useQuery<typeof api.userProfile.get>>
>;

function ProfileSection({ profile }: { profile: NonNullable<ProfileData> }) {
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gender, setGender] = useState(profile.gender ?? null);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");
  const [hairType, setHairType] = useState(profile.hairType ?? null);
  const [hairLength, setHairLength] = useState(profile.hairLength ?? null);
  const [allergies, setAllergies] = useState<string[]>(profile.allergies ?? []);
  const [allergyNotes, setAllergyNotes] = useState(profile.allergyNotes ?? "");

  const toggleAllergen = (id: string) => {
    setAllergies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        gender: (gender as "male" | "female" | "unspecified") ?? undefined,
        dateOfBirth: dateOfBirth || undefined,
        hairType:
          (hairType as "straight" | "wavy" | "curly" | "very_curly") ??
          undefined,
        hairLength:
          (hairLength as "short" | "medium" | "long" | "very_long") ??
          undefined,
        allergies: allergies.length > 0 ? allergies : undefined,
        allergyNotes: allergyNotes.trim() || undefined,
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
            max={
              new Date(
                new Date().getFullYear() - 13,
                new Date().getMonth(),
                new Date().getDate(),
              )
                .toISOString()
                .split("T")[0]
            }
            min="1920-01-01"
            className="max-w-48"
          />
        </div>

        <Separator />

        {/* Hair Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Hair Type</Label>
          <div className="flex gap-2 flex-wrap">
            {HAIR_TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setHairType(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  hairType === option.id &&
                    "border-primary bg-primary/5 font-medium",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hair Length */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Hair Length</Label>
          <div className="flex gap-2 flex-wrap">
            {HAIR_LENGTH_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setHairLength(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  hairLength === option.id &&
                    "border-primary bg-primary/5 font-medium",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Allergies */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <Label className="text-sm font-medium">
              Allergies / Sensitivities
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COMMON_ALLERGENS.map((allergen) => (
              <div key={allergen.id} className="flex items-center gap-2">
                <Checkbox
                  id={`settings-allergen-${allergen.id}`}
                  checked={allergies.includes(allergen.id)}
                  onCheckedChange={() => toggleAllergen(allergen.id)}
                />
                <Label
                  htmlFor={`settings-allergen-${allergen.id}`}
                  className="text-sm cursor-pointer"
                >
                  {allergen.label}
                </Label>
              </div>
            ))}
          </div>
          <Textarea
            value={allergyNotes}
            onChange={(e) => setAllergyNotes(e.target.value)}
            placeholder="List any other sensitivities..."
            rows={2}
          />
        </div>

        <Button onClick={handleSave} disabled={isSubmitting}>
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

// =============================================================================
// Notification Section
// =============================================================================

function NotificationSection({
  profile,
}: {
  profile: NonNullable<ProfileData>;
}) {
  const updatePrefs = useMutation(
    api.userProfile.updateNotificationPreferences,
  );
  const [emailReminders, setEmailReminders] = useState(
    profile.emailReminders ?? true,
  );
  const [marketingEmails, setMarketingEmails] = useState(
    profile.marketingEmails ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updatePrefs({
        emailReminders,
        marketingEmails,
        marketingConsent: marketingEmails,
      });
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="size-4" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Appointment Reminders</Label>
            <p className="text-xs text-muted-foreground">
              Email reminder 24 hours before your appointment
            </p>
          </div>
          <Switch
            checked={emailReminders}
            onCheckedChange={setEmailReminders}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Pazarlama Emailleri</Label>
            <p className="text-xs text-muted-foreground">
              İndirimler, kampanyalar ve yeni hizmet duyuruları
            </p>
          </div>
          <Switch
            checked={marketingEmails}
            onCheckedChange={setMarketingEmails}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Check className="mr-2 size-4" />
          )}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Consent Section
// =============================================================================

function ConsentSection({ profile }: { profile: NonNullable<ProfileData> }) {
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
          <button
            type="button"
            className="text-primary underline underline-offset-2"
            onClick={() => window.open("/privacy", "_blank")}
          >
            Privacy Policy
          </button>
          .
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-2xl p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
