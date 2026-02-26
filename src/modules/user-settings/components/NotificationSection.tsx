"use client";

import { useMutation, type useQuery } from "convex/react";
import { Bell, Check, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "../../../../convex/_generated/api";

type ProfileData = NonNullable<
  ReturnType<typeof useQuery<typeof api.userProfile.get>>
>;

export function NotificationSection({
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
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
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
