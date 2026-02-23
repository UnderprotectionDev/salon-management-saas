"use client";

import {
  AlertTriangle,
  Bell,
  Cake,
  Mail,
  Phone,
  User as UserIcon,
} from "lucide-react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { GENDER_OPTIONS } from "@/modules/onboarding/lib/constants";
import type { WizardFormData } from "../hooks/useUserOnboardingForm";

function PreviewLine({
  show,
  icon: Icon,
  children,
}: {
  show: boolean;
  icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-background/70 animate-[onboarding-fade-in_0.3s_ease-out]">
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function calculateAge(dateStr: string): number | null {
  const birth = new Date(dateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  if (birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function ProfilePreviewCard({
  user,
  formData,
}: {
  user: {
    _id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  formData: WizardFormData;
}) {
  const genderLabel = GENDER_OPTIONS.find(
    (g) => g.id === formData.gender,
  )?.label;
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;

  const notifSummary = [
    formData.emailReminders && "Reminders",
    formData.marketingEmails && "Promotions",
  ]
    .filter(Boolean)
    .join(", ");

  const avatarConfig = formData.avatarConfig ?? genConfig(user._id);

  return (
    <div className="mx-6 rounded-xl bg-background/10 backdrop-blur-sm p-5 space-y-3">
      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full overflow-hidden ring-2 ring-background/20 shrink-0">
          <NiceAvatar
            style={{ width: "100%", height: "100%" }}
            shape="circle"
            {...avatarConfig}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-background truncate">
            {user.name || "Your Name"}
          </p>
          <p className="text-xs text-background/50 truncate">{user.email}</p>
        </div>
      </div>

      {/* Dynamic fields */}
      <div className="space-y-1.5 border-t border-background/10 pt-3">
        <PreviewLine show={!!genderLabel} icon={UserIcon}>
          {genderLabel}
        </PreviewLine>
        <PreviewLine show={age !== null} icon={Cake}>
          {age} years old
        </PreviewLine>
        <PreviewLine show={!!formData.phone} icon={Phone}>
          {formData.phone}
        </PreviewLine>
        <PreviewLine show={formData.allergies.length > 0} icon={AlertTriangle}>
          {formData.allergies.length} allergie
          {formData.allergies.length !== 1 ? "s" : ""}
        </PreviewLine>
        <PreviewLine
          show={!!notifSummary}
          icon={formData.emailReminders ? Bell : Mail}
        >
          {notifSummary}
        </PreviewLine>
      </div>
    </div>
  );
}
