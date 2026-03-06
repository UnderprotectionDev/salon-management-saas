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
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { GENDER_OPTIONS } from "@/modules/onboarding";
import { AllergiesSection } from "@/modules/settings/components/AllergiesSection";
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
import { SettingsSkeleton } from "@/modules/user-settings/components/skeletons/SettingsSkeleton";
import { api } from "../../../convex/_generated/api";

// Date of birth max: 13 years ago (local date)
const now = new Date();
const MAX_DOB = `${now.getFullYear() - 13}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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

        {/* Personal Info (editable) */}
        {profile && <ProfileSection profile={profile} />}

        {/* Allergies */}
        {profile && (
          <AllergiesSection
            allergies={profile.allergies ?? []}
            allergyNotes={profile.allergyNotes ?? ""}
          />
        )}

        {/* Salon Category Preferences */}
        {profile && <SalonPreferencesSection profile={profile} />}

        {/* Notification Preferences */}
        {profile && <NotificationSection profile={profile} />}

        {/* KVKK Consent Management */}
        {profile && <ConsentSection profile={profile} />}

        {/* Danger Zone: Account Deletion */}
        <DeleteAccountSection />
      </div>
    </div>
  );
}

// =============================================================================
// Profile Section (basic personal info — no allergies)
// =============================================================================

type ProfileData = NonNullable<
  ReturnType<typeof useQuery<typeof api.userProfile.get>>
>;

function ProfileSection({ profile }: { profile: NonNullable<ProfileData> }) {
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

// =============================================================================
// Salon Preferences Section (category selector + per-category forms)
// =============================================================================

function SalonPreferencesSection({
  profile,
}: {
  profile: NonNullable<ProfileData>;
}) {
  const prefs = profile.salonPreferences;
  const selectedCategories: string[] = prefs?.selectedCategories ?? [];

  // Filter to only show categories the user selected
  const activeCategories = USER_SALON_CATEGORIES.filter((cat) =>
    selectedCategories.includes(cat.key),
  );

  return (
    <>
      {/* Category Selector */}
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

      {/* Category-specific preference forms */}
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

// Route to the correct form based on category key
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
            <Label className="text-sm font-medium">Marketing Emails</Label>
            <p className="text-xs text-muted-foreground">
              Discounts, campaigns, and new service announcements
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
          type="button"
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

// =============================================================================
// Delete Account Section
// =============================================================================

function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const deleteAccount = useMutation(api.users.deleteMyAccount);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await deleteAccount({});
      toast.success("Account deleted successfully");
      router.replace("/sign-in");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <Trash2 className="size-4" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setConfirmText("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 size-4" />
              Delete My Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This will permanently delete your account, profile data, and
                remove you from any salon you belong to. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mb-1 inline size-4" /> If you are the
                owner of a salon, you must transfer ownership before deleting
                your account.
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <strong>DELETE</strong> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                {isDeleting ? "Deleting..." : "Delete Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
