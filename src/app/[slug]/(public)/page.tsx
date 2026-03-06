"use client";

import { useQuery } from "convex/react";
import {
  Building2,
  Calendar,
  Clock,
  Globe,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Phone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
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
      <section className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="size-24 border-4 border-background shadow-lg">
              {organization.logo ? (
                <AvatarImage src={organization.logo} alt={organization.name} />
              ) : (
                <AvatarFallback className="text-2xl">
                  <Building2 className="size-10" />
                </AvatarFallback>
              )}
            </Avatar>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                {organization.name}
              </h1>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {organization.salonType && (
                  <SalonTypeBadges salonType={organization.salonType} />
                )}
                <Badge variant={todayStatus.isOpen ? "default" : "secondary"}>
                  {todayStatus.isOpen ? "Open" : "Closed"}
                  {todayStatus.hours && ` · ${todayStatus.hours}`}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button asChild size="lg">
                <Link href={`/${slug}/book`}>
                  <Calendar className="mr-2 size-4" />
                  Book Now
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={`/${slug}/catalog`}>
                  <Package className="mr-2 size-4" />
                  Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 space-y-16">
        {/* About */}
        {organization.description && (
          <section>
            <SectionHeader icon={<Info className="size-5" />} title="About" />
            <div className="mt-6 max-w-2xl">
              <RichTextDisplay
                html={organization.description}
                className="text-muted-foreground"
              />
            </div>
          </section>
        )}

        {/* Popular Services */}
        {popularServices.length > 0 && (
          <section>
            <SectionHeader
              icon={<Calendar className="size-5" />}
              title="Popular Services"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {popularServices.map((service) => (
                <Card
                  key={service._id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    {service.categoryName && (
                      <CardDescription>{service.categoryName}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">
                        {formatPrice(service.price)}
                      </span>
                      <span className="text-muted-foreground">
                        <Clock className="mr-1 inline size-3.5" />
                        {service.duration} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button asChild variant="outline">
                <Link href={`/${slug}/book`}>View All Services & Book</Link>
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
              {staff.map((member) => (
                <Card key={member._id} className="text-center">
                  <CardContent className="pt-6">
                    <div className="flex justify-center mb-3">
                      {member.imageUrl ? (
                        <Avatar className="size-20 border-2">
                          <AvatarImage
                            src={member.imageUrl}
                            alt={member.name}
                          />
                          <AvatarFallback>
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <NiceAvatar
                          className="size-20"
                          {...(member.avatarConfig ?? genConfig(member._id))}
                        />
                      )}
                    </div>
                    <h3 className="font-semibold">{member.name}</h3>
                    {member.bio && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
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
                      <div className="space-y-2">
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
                              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                                isToday ? "bg-primary/10 font-medium" : ""
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {isToday && (
                                  <span className="size-2 rounded-full bg-primary" />
                                )}
                                {DAY_LABELS[day]}
                              </span>
                              <span
                                className={
                                  hours?.closed ? "text-muted-foreground" : ""
                                }
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
                    <CardContent className="pt-6 space-y-4">
                      {locationParts.length > 0 && (
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm">
                            {locationParts.join(", ")}
                          </span>
                        </div>
                      )}
                      {phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="size-4 shrink-0 text-muted-foreground" />
                          <a
                            href={`tel:${cleanPhone}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {phone}
                          </a>
                        </div>
                      )}
                      {settings?.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="size-4 shrink-0 text-muted-foreground" />
                          <a
                            href={`mailto:${settings.email}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {settings.email}
                          </a>
                        </div>
                      )}
                      {settings?.website && (
                        <div className="flex items-center gap-3">
                          <Globe className="size-4 shrink-0 text-muted-foreground" />
                          <a
                            href={
                              settings.website.startsWith("http://") ||
                              settings.website.startsWith("https://")
                                ? settings.website
                                : `https://${settings.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {settings.website}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <Separator />
        <section className="text-center space-y-4 pb-4">
          <h2 className="text-2xl font-semibold">Ready to book?</h2>
          <p className="text-muted-foreground">
            Book your appointment at {organization.name} today.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href={`/${slug}/book`}>
                <Calendar className="mr-2 size-4" />
                Book Now
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${slug}/catalog`}>
                <Package className="mr-2 size-4" />
                Browse Products
              </Link>
            </Button>
          </div>
        </section>
      </main>

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
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
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
        <Badge key={type} variant="secondary" className="capitalize">
          {type.replace(/_/g, " ")}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-muted-foreground">
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
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <p>
        Powered by{" "}
        <Link href="/" className="text-primary hover:underline">
          Salon Management
        </Link>
      </p>
    </footer>
  );
}
