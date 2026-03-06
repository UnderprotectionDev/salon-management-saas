import { AlignLeft, Clock, Globe, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { stripHtml } from "@/lib/html";
import type { WizardFormData } from "../hooks/useOnboardingForm";
import { SALON_TYPE_OPTIONS } from "../lib/constants";
import { DEFAULT_HOURS_SUMMARY } from "../lib/utils";

function PreviewLine({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`transition-all duration-300 ${
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-1 h-0 overflow-hidden"
      }`}
    >
      {children}
    </div>
  );
}

export function SalonPreviewCard({
  data,
  logoPreview,
  hoursSummary,
}: {
  data: WizardFormData;
  logoPreview: string | null;
  hoursSummary: string;
}) {
  const displayName = data.name || "Your Salon";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const typeLabels = data.salonType
    .map((t) => SALON_TYPE_OPTIONS.find((o) => o.value === t)?.label)
    .filter(Boolean);

  const hasLocation = data.city || data.district;
  const fullAddress = [data.street, data.district, data.city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-8 rounded-lg border border-background/10 bg-background/5 p-5 space-y-4">
      <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-background/40 mb-3">
        PREVIEW
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <Avatar className="size-10 border border-background/20">
          {logoPreview && <AvatarImage src={logoPreview} alt="Logo" />}
          <AvatarFallback className="bg-brand text-brand-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-background truncate">
            {displayName}
          </div>
        </div>
      </div>

      {/* Type badges */}
      <PreviewLine show={typeLabels.length > 0}>
        <div className="flex flex-wrap gap-1">
          {typeLabels.map((label) => (
            <span
              key={label}
              className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand/20 text-brand"
            >
              {label}
            </span>
          ))}
        </div>
      </PreviewLine>

      {/* Booking URL */}
      <PreviewLine show={data.slug.length > 0}>
        <div className="flex items-center gap-1.5 text-background/50">
          <Globe className="size-3 shrink-0" />
          <span className="text-xs font-mono truncate">
            yoursite.com/{data.slug}
          </span>
        </div>
      </PreviewLine>

      {/* Location */}
      <PreviewLine show={!!hasLocation}>
        <div className="flex items-start gap-1.5 text-background/50">
          <MapPin className="size-3 shrink-0 mt-0.5" />
          <span className="text-xs leading-snug">{fullAddress}</span>
        </div>
      </PreviewLine>

      {/* Description */}
      <PreviewLine show={stripHtml(data.description).length > 0}>
        <div className="flex items-start gap-1.5 text-background/50">
          <AlignLeft className="size-3 shrink-0 mt-0.5" />
          <span className="text-xs leading-snug line-clamp-2">
            {stripHtml(data.description)}
          </span>
        </div>
      </PreviewLine>

      {/* Hours */}
      <PreviewLine show={hoursSummary !== DEFAULT_HOURS_SUMMARY}>
        <div className="flex items-center gap-1.5 text-background/50">
          <Clock className="size-3 shrink-0" />
          <span className="text-xs truncate">{hoursSummary}</span>
        </div>
      </PreviewLine>
    </div>
  );
}
