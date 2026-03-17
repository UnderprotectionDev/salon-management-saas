"use client";

import { useQuery } from "convex/react";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { RichTextDisplay } from "@/components/rich-editor/RichTextDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { PublicProfileSkeleton } from "@/modules/booking/components/skeletons/PublicProfileSkeleton";
import { api } from "../../../../convex/_generated/api";

type BusinessHoursDay = {
  open: string;
  close: string;
  closed: boolean;
};

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const ORDERED_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function getTodayStatus(
  businessHours?: Record<string, BusinessHoursDay | undefined> | null,
): { isOpen: boolean; hours?: string } {
  if (!businessHours) return { isOpen: false };

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const today = businessHours[dayKey];

  if (!today || today.closed) return { isOpen: false };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);

  if (
    Number.isNaN(openH) ||
    Number.isNaN(openM) ||
    Number.isNaN(closeH) ||
    Number.isNaN(closeM)
  ) {
    return { isOpen: false };
  }

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen =
    closeMinutes > openMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  return { isOpen, hours: `${today.open} - ${today.close}` };
}

export default function SalonProfilePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const organization = useQuery(api.organizations.getBySlug, { slug });
  const settings = useQuery(
    api.organizations.getPublicSettings,
    organization ? { organizationId: organization._id } : "skip",
  );
  const services = useQuery(
    api.services.listPublic,
    organization ? { organizationId: organization._id } : "skip",
  );
  const staff = useQuery(
    api.staff.listPublicActive,
    organization ? { organizationId: organization._id } : "skip",
  );

  const [todayStatus, setTodayStatus] = useState<{
    isOpen: boolean;
    hours?: string;
  }>({ isOpen: false });
  const [todayKey, setTodayKey] = useState("");
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [aboutOverflows, setAboutOverflows] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateStatus = () => {
      if (settings?.businessHours) {
        setTodayStatus(getTodayStatus(settings.businessHours));
      }
      const now = new Date();
      setTodayKey(DAY_KEYS[now.getDay()]);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60_000);
    return () => clearInterval(interval);
  }, [settings?.businessHours]);

  useEffect(() => {
    if (aboutRef.current) {
      setAboutOverflows(aboutRef.current.scrollHeight > 200);
    }
  }, [organization?.description]);

  // Loading state
  if (organization === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <ProfileHeader slug={slug} />
        <main className="container mx-auto px-4 py-8">
          <PublicProfileSkeleton />
        </main>
        <ProfileFooter />
      </div>
    );
  }

  // Not found
  if (organization === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto mb-4 size-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium">Salon not found</h2>
          <p className="mt-1 text-muted-foreground">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/">Browse Salons</Link>
          </Button>
        </div>
      </div>
    );
  }

  const popularServices = services?.filter((s) => s.isPopular) ?? [];
  const phone = settings?.phone;
  const cleanPhone = phone?.replace(/[\s\-().]/g, "");
  const address = settings?.address;
  const businessHours = settings?.businessHours;

  const locationParts = [
    address?.street,
    (address as Record<string, string> | undefined)?.district,
    address?.city,
    address?.state,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <ProfileHeader
        slug={slug}
        orgName={organization.name}
        logo={organization.logo}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/60 via-muted/30 to-background">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="flex flex-col items-center text-center gap-5">
            {/* Avatar with brand ring */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-brand/30 to-brand/10 blur-sm" />
              <Avatar className="relative size-28 border-4 border-background shadow-xl">
                {organization.logo ? (
                  <AvatarImage
                    src={organization.logo}
                    alt={organization.name}
                  />
                ) : (
                  <AvatarFallback className="text-2xl bg-muted">
                    <Building2 className="size-12 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Name + Status */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                {organization.name}
              </h1>

              {/* Location snippet in hero */}
              {locationParts.length > 0 && (
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {locationParts.join(", ")}
                </p>
              )}

              {/* Badges row */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {organization.salonType && (
                  <SalonTypeBadges salonType={organization.salonType} />
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5",
                    todayStatus.isOpen
                      ? "border-green-500/40 text-green-600 dark:text-green-400"
                      : "border-red-500/40 text-red-600 dark:text-red-400",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      todayStatus.isOpen ? "bg-green-500" : "bg-red-500",
                    )}
                  />
                  {todayStatus.isOpen ? "Open" : "Closed"}
                  {todayStatus.hours && (
                    <span className="text-muted-foreground">
                      {todayStatus.hours}
                    </span>
                  )}
                </Badge>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mt-1">
              <Button asChild size="lg" className="shadow-sm">
                <Link href={`/${slug}/book`}>
                  <Calendar className="mr-2 size-4" />
                  Book Now
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="shadow-sm">
                <Link href={`/${slug}/catalog`}>
                  <Package className="mr-2 size-4" />
                  Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-14 space-y-20">
        {/* About */}
        {organization.description && (
          <section>
            <SectionHeader icon={<Info className="size-5" />} title="About" />
            <Card className="mt-6">
              <CardContent className="relative px-6 pt-6 pb-2 sm:px-8 sm:pt-8">
                <div
                  ref={aboutRef}
                  className={cn(
                    "about-content overflow-hidden transition-[max-height] duration-300 ease-in-out",
                    !isAboutExpanded && aboutOverflows && "max-h-[240px]",
                  )}
                >
                  <RichTextDisplay
                    html={organization.description}
                    className="text-muted-foreground"
                  />
                </div>
                {aboutOverflows && !isAboutExpanded && (
                  <div className="absolute bottom-12 left-0 right-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
                )}
                {aboutOverflows && (
                  <div className="relative flex justify-center pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {isAboutExpanded ? (
                        <>
                          Show less <ChevronUp className="size-3.5" />
                        </>
                      ) : (
                        <>
                          Read more <ChevronDown className="size-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Popular Services */}
        {popularServices.length > 0 && (
          <section>
            <SectionHeader
              icon={<Sparkles className="size-5" />}
              title="Popular Services"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {popularServices.map((service) => (
                <Card
                  key={service._id}
                  className="group transition-all duration-200 hover:shadow-md hover:border-brand/30"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {service.name}
                    </CardTitle>
                    {service.categoryName && (
                      <CardDescription>{service.categoryName}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand">
                        {formatPrice(service.price)}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {service.duration} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" className="group">
                <Link href={`/${slug}/book`}>
                  View All Services & Book
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Our Team */}
        {staff && staff.length > 0 && (
          <section>
            <SectionHeader
              icon={<Users className="size-5" />}
              title="Our Team"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
              {staff.map((member) => (
                <Card
                  key={member._id}
                  className="group text-center transition-all duration-200 hover:shadow-md hover:border-brand/30"
                >
                  <CardContent className="pt-8 pb-6">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {member.imageUrl ? (
                          <Avatar className="relative size-24 border-2 border-border group-hover:border-brand/30 transition-colors">
                            <AvatarImage
                              src={member.imageUrl}
                              alt={member.name}
                            />
                            <AvatarFallback>
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="relative">
                            <NiceAvatar
                              className="size-24"
                              {...(member.avatarConfig ??
                                genConfig(member._id))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-base">{member.name}</h3>
                    {member.serviceIds && member.serviceIds.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.serviceIds.length} service
                        {member.serviceIds.length !== 1 && "s"}
                      </p>
                    )}
                    {member.bio && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Business Hours & Contact */}
        {(businessHours ||
          phone ||
          settings?.email ||
          settings?.website ||
          locationParts.length > 0) && (
          <section>
            <div className="grid gap-8 md:grid-cols-2">
              {/* Business Hours */}
              {businessHours && (
                <div>
                  <SectionHeader
                    icon={<Clock className="size-5" />}
                    title="Business Hours"
                  />
                  <Card className="mt-6">
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        {ORDERED_DAYS.map((day) => {
                          const hours = (
                            businessHours as Record<
                              string,
                              BusinessHoursDay | undefined
                            >
                          )[day];
                          const isToday = day === todayKey;
                          return (
                            <div
                              key={day}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                                isToday &&
                                  "bg-brand/8 ring-1 ring-brand/20 font-medium",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                {isToday && (
                                  <span className="size-2 rounded-full bg-brand animate-pulse" />
                                )}
                                {DAY_LABELS[day]}
                              </span>
                              <span
                                className={cn(
                                  hours?.closed
                                    ? "text-muted-foreground"
                                    : isToday
                                      ? "text-brand font-semibold"
                                      : "",
                                )}
                              >
                                {hours && !hours.closed
                                  ? `${hours.open} - ${hours.close}`
                                  : "Closed"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Contact & Location */}
              {(phone ||
                settings?.email ||
                settings?.website ||
                locationParts.length > 0) && (
                <div>
                  <SectionHeader
                    icon={<MapPin className="size-5" />}
                    title="Contact & Location"
                  />
                  <Card className="mt-6">
                    <CardContent className="pt-6 space-y-1">
                      {locationParts.length > 0 && (
                        <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <MapPin className="size-4 text-muted-foreground" />
                          </div>
                          <div className="pt-1">
                            <span className="text-sm">
                              {locationParts.join(", ")}
                            </span>
                          </div>
                        </div>
                      )}
                      {phone && (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Phone className="size-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm hover:underline">
                            {phone}
                          </span>
                        </a>
                      )}
                      {settings?.email && (
                        <a
                          href={`mailto:${settings.email}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Mail className="size-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm hover:underline">
                            {settings.email}
                          </span>
                        </a>
                      )}
                      {settings?.website && (
                        <a
                          href={
                            settings.website.startsWith("http://") ||
                            settings.website.startsWith("https://")
                              ? settings.website
                              : `https://${settings.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Globe className="size-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm hover:underline">
                            {settings.website}
                          </span>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Bottom CTA */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16 text-center space-y-5">
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Ready to book?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Book your appointment at {organization.name} today.
          </p>
          <div className="flex justify-center gap-3 pt-1">
            <Button asChild size="lg" className="shadow-sm">
              <Link href={`/${slug}/book`}>
                <Calendar className="mr-2 size-4" />
                Book Now
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="shadow-sm">
              <Link href={`/${slug}/catalog`}>
                <Package className="mr-2 size-4" />
                Browse Products
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <ProfileFooter />

      {/* Floating contact buttons */}
      {cleanPhone && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
          <a
            href={`https://wa.me/${cleanPhone.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110"
            aria-label="Contact via WhatsApp"
          >
            <MessageCircle className="size-5" />
          </a>
          <a
            href={`tel:${cleanPhone}`}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
            aria-label="Call salon"
          >
            <Phone className="size-5" />
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

const MAX_VISIBLE_BADGES = 3;

function SalonTypeBadges({ salonType }: { salonType: string | string[] }) {
  const types = Array.isArray(salonType) ? salonType : [salonType];
  const visible = types.slice(0, MAX_VISIBLE_BADGES);
  const remaining = types.length - MAX_VISIBLE_BADGES;

  return (
    <>
      {visible.map((type) => (
        <Badge
          key={type}
          variant="secondary"
          className="capitalize font-normal"
        >
          {type.replace(/_/g, " ")}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-muted-foreground font-normal">
          +{remaining} more
        </Badge>
      )}
    </>
  );
}

function ProfileHeader({
  slug,
  orgName,
  logo,
}: {
  slug: string;
  orgName?: string;
  logo?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link
          href={`/${slug}`}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Avatar className="size-9 border">
            {logo ? (
              <AvatarImage src={logo} alt={orgName ?? "Salon"} />
            ) : (
              <AvatarFallback>
                <Building2 className="size-4" />
              </AvatarFallback>
            )}
          </Avatar>
          {orgName && <span className="text-sm font-semibold">{orgName}</span>}
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${slug}/book`}>
              <Calendar className="mr-1.5 size-4" />
              Book
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${slug}/catalog`}>
              <Package className="mr-1.5 size-4" />
              Products
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${slug}/designs`}>
              <Palette className="mr-1.5 size-4" />
              Designs
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function ProfileFooter() {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      <p>
        Powered by{" "}
        <Link href="/" className="text-brand hover:underline">
          Salon Management
        </Link>
      </p>
    </footer>
  );
}
