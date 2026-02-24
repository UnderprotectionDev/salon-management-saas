"use client";

import { Building2, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveOrganization } from "@/modules/organization";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Salon Info", icon: Building2, segment: "general" },
  { label: "Contact & Location", icon: MapPin, segment: "contact" },
  { label: "Working Hours", icon: Clock, segment: "hours" },
  { label: "Booking Settings", icon: CalendarDays, segment: "booking" },
  { label: "Team", icon: Users, segment: "team" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const activeOrganization = useActiveOrganization();
  const slug = activeOrganization?.slug;

  if (!slug) return null;

  return (
    <>
      {/* Mobile: horizontal scrollable pill bar */}
      <nav
        className="flex gap-1 overflow-x-auto pb-2 md:hidden"
        aria-label="Settings navigation"
      >
        {NAV_ITEMS.map((item) => {
          const href = `/${slug}/settings/${item.segment}`;
          const isActive = pathname === href;
          const Icon = item.icon;
          return (
            <Link
              key={item.segment}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: vertical nav list */}
      <nav
        className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1"
        aria-label="Settings navigation"
      >
        {NAV_ITEMS.map((item) => {
          const href = `/${slug}/settings/${item.segment}`;
          const isActive = pathname === href;
          const Icon = item.icon;
          return (
            <Link
              key={item.segment}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
