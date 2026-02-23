"use client";

import {
  Calendar,
  Check,
  RefreshCw,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { useId, useState } from "react";
import NiceAvatar from "react-nice-avatar";
import { Input } from "@/components/ui/input";
import { SectionDivider } from "@/modules/org-onboarding";
import { ONBOARDING_INPUT } from "@/modules/org-onboarding/lib/constants";
import { GENDER_OPTIONS } from "@/modules/onboarding/lib/constants";
import { generateAvatarSet } from "../lib/avatar";
import type { AvatarConfig, Gender } from "../lib/avatar";
import type { WizardFormData } from "../hooks/useUserOnboardingForm";

const GENDER_ICONS: Record<string, typeof User> = {
  female: UserRound,
  male: User,
  unspecified: Users,
};

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("90") ? digits.slice(2) : digits;
  const d = local.slice(0, 10);

  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

function toFormattedPhone(raw: string): string {
  if (!raw) return "";
  return `+90 ${raw}`;
}

export function StepAboutYou({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
}) {
  const phoneHintId = useId();
  const dobId = useId();
  const phoneInputId = useId();
  const [variants, setVariants] = useState<AvatarConfig[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const today = new Date();
  const minAge13 = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate(),
  )
    .toISOString()
    .split("T")[0];

  const phoneDisplay = data.phone.startsWith("+90 ")
    ? data.phone.slice(4)
    : data.phone.replace("+90", "").trim();

  const isPhoneValid =
    !phoneDisplay || /^5\d{2} \d{3} \d{2} \d{2}$/.test(phoneDisplay);

  return (
    <div className="space-y-10">
      {/* Gender */}
      <div>
        <SectionDivider
          title="PERSONAL"
          badge="OPTIONAL"
          complete={!!data.gender}
        />
        <fieldset className="grid grid-cols-3 gap-3">
          <legend className="sr-only">Gender selection</legend>
          {GENDER_OPTIONS.map((opt) => {
            const Icon = GENDER_ICONS[opt.id] ?? User;
            const selected = data.gender === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer ${
                  selected
                    ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={opt.id}
                  checked={selected}
                  onClick={() => {
                    if (selected) {
                      onChange({ gender: null, avatarConfig: null });
                      setVariants([]);
                    }
                  }}
                  onChange={() => {
                    const newVariants = generateAvatarSet(opt.id as Gender, 6);
                    setVariants(newVariants);
                    setSelectedIndex(0);
                    onChange({ gender: opt.id, avatarConfig: newVariants[0] });
                  }}
                  className="sr-only"
                />
                <Icon
                  className={`size-6 ${selected ? "text-brand" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <span className="text-xs font-bold uppercase tracking-wide">
                  {opt.label}
                </span>
                {selected && (
                  <Check className="size-3.5 text-brand animate-[scale-in_0.2s_ease-out]" />
                )}
              </label>
            );
          })}
        </fieldset>

        {/* Avatar grid — appears on gender selection */}
        {data.gender && variants.length > 0 && (
          <div className="mt-4 space-y-3 animate-[onboarding-fade-in_0.3s_ease-out]">
            <p className="text-xs font-medium text-muted-foreground">
              Choose your avatar
            </p>
            <div className="grid grid-cols-6 gap-3">
              {variants.map((config, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(i);
                    onChange({ avatarConfig: config });
                  }}
                  className={`relative size-12 shrink-0 rounded-full ring-offset-2 ring-offset-background transition-all duration-200 ${
                    selectedIndex === i
                      ? "ring-2 ring-brand scale-110 shadow-md"
                      : "ring-2 ring-transparent hover:ring-border hover:scale-105"
                  }`}
                >
                  <div className="size-full overflow-hidden rounded-full">
                    <NiceAvatar
                      style={{ width: "100%", height: "100%" }}
                      shape="circle"
                      {...config}
                    />
                  </div>
                  {selectedIndex === i && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                      <Check
                        className="size-2.5 stroke-[3]"
                        aria-hidden="true"
                      />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const newVariants = generateAvatarSet(data.gender as Gender, 6);
                setVariants(newVariants);
                setSelectedIndex(0);
                onChange({ avatarConfig: newVariants[0] });
              }}
              className="inline-flex w-fit items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Generate more
            </button>
          </div>
        )}
      </div>

      {/* Date of Birth */}
      <div>
        <SectionDivider
          title="BIRTHDAY"
          badge="OPTIONAL"
          complete={!!data.dateOfBirth}
        />
        <div className="flex items-center gap-3">
          <Calendar
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor={dobId} className="sr-only">
            Date of birth
          </label>
          <Input
            id={dobId}
            type="date"
            autoComplete="bday"
            max={minAge13}
            min="1920-01-01"
            value={data.dateOfBirth ?? ""}
            onChange={(e) => onChange({ dateOfBirth: e.target.value || null })}
            className={ONBOARDING_INPUT}
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <SectionDivider
          title="PHONE"
          badge="OPTIONAL"
          complete={!!phoneDisplay && isPhoneValid}
        />
        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-base text-muted-foreground select-none">
            +90
          </span>
          <label htmlFor={phoneInputId} className="sr-only">
            Phone number
          </label>
          <Input
            id={phoneInputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="5XX XXX XX XX"
            value={phoneDisplay}
            onChange={(e) => {
              const formatted = formatPhoneInput(e.target.value);
              onChange({ phone: formatted ? toFormattedPhone(formatted) : "" });
            }}
            aria-describedby={phoneHintId}
            className={`${ONBOARDING_INPUT} pl-10`}
          />
        </div>
        <p
          id={phoneHintId}
          className={`mt-1.5 text-xs ${
            phoneDisplay && !isPhoneValid
              ? "text-destructive"
              : "text-muted-foreground/60"
          }`}
        >
          {phoneDisplay && !isPhoneValid
            ? "Invalid format. Expected: 5XX XXX XX XX"
            : "Turkish mobile number format"}
        </p>
      </div>
    </div>
  );
}
