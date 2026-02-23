"use client";

import { useId } from "react";
import { Bell, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionDivider } from "@/modules/org-onboarding";
import type { WizardFormData } from "../hooks/useUserOnboardingForm";

export function StepNotifications({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
}) {
  const consentDescId = useId();

  return (
    <div className="space-y-10">
      {/* Email Preferences */}
      <div>
        <SectionDivider title="PREFERENCES" badge="OPTIONAL" />

        <div className="space-y-6">
          {/* Appointment Reminders */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bell
                className="size-5 text-muted-foreground mt-0.5"
                aria-hidden="true"
              />
              <div>
                <Label
                  htmlFor="email-reminders"
                  className="text-sm font-medium cursor-pointer"
                >
                  Appointment reminders
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get notified before your appointments.
                </p>
              </div>
            </div>
            <Switch
              id="email-reminders"
              checked={data.emailReminders}
              onCheckedChange={(checked) =>
                onChange({ emailReminders: checked })
              }
            />
          </div>

          {/* Marketing Emails */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mail
                className="size-5 text-muted-foreground mt-0.5"
                aria-hidden="true"
              />
              <div>
                <Label
                  htmlFor="marketing-emails"
                  className="text-sm font-medium cursor-pointer"
                >
                  Promotions & updates
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive special offers and salon news.
                </p>
              </div>
            </div>
            <Switch
              id="marketing-emails"
              checked={data.marketingEmails}
              onCheckedChange={(checked) => {
                const patch: Partial<WizardFormData> = {
                  marketingEmails: checked,
                };
                if (!checked) {
                  patch.marketingConsent = false;
                }
                onChange(patch);
              }}
            />
          </div>
        </div>
      </div>

      {/* KVKK Consent (only shown when marketing is enabled) */}
      {data.marketingEmails && (
        <div className="animate-[onboarding-fade-in_0.3s_ease-out]">
          <SectionDivider title="CONSENT" badge="REQUIRED" />
          <div className="flex items-start gap-3">
            <Checkbox
              id="marketing-consent"
              checked={data.marketingConsent}
              onCheckedChange={(checked) =>
                onChange({ marketingConsent: !!checked })
              }
              aria-describedby={consentDescId}
            />
            <div>
              <Label
                htmlFor="marketing-consent"
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                I consent to receiving marketing communications in accordance
                with KVKK regulations.
              </Label>
              <p
                id={consentDescId}
                className="text-xs text-muted-foreground mt-1"
              >
                You can withdraw your consent at any time from your profile
                settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
