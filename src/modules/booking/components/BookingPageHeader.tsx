"use client";

import { useMutation, useQuery } from "convex/react";
import { Heart, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type BusinessHoursDay = {
  open: string;
  close: string;
  closed: boolean;
};

type BookingPageHeaderProps = {
  salonName: string;
  address?: { city?: string; state?: string } | null;
  businessHours?: Record<string, BusinessHoursDay | undefined> | null;
  organizationId?: Id<"organization">;
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

  // Handle overnight hours (e.g., open: "22:00", close: "02:00")
  const isOpen =
    closeMinutes > openMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  return {
    isOpen,
    hours: `${today.open} - ${today.close}`,
  };
}

export function BookingPageHeader({
  salonName,
  address,
  businessHours,
  organizationId,
}: BookingPageHeaderProps) {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  // Compute date and open/closed status client-side only to avoid hydration mismatch
  const [dateStr, setDateStr] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDateStr(
      now.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
    );
    setIsOpen(getTodayStatus(businessHours).isOpen);
  }, [businessHours]);

  const session = authClient.useSession();
  const isAuthenticated = !!session.data?.user;

  const isFavorite = useQuery(
    api.favoriteSalons.isFavorite,
    isAuthenticated && organizationId ? { organizationId } : "skip",
  );

  const toggleFavorite = useMutation(api.favoriteSalons.toggle);

  const handleToggleFavorite = async () => {
    if (!organizationId) return;
    setIsTogglingFavorite(true);
    try {
      const result = await toggleFavorite({ organizationId });
      toast.success(
        result.isFavorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch {
      toast.error("Failed to update favorites. Please try again.");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const location = [address?.city, address?.state].filter(Boolean).join(" / ");

  return (
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight uppercase">
          {salonName}
        </h1>
        <div className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-widest">
          {dateStr && (
            <div>
              <span className="text-muted-foreground">Date</span>
              <div className="font-semibold">{dateStr}</div>
            </div>
          )}
          {location && (
            <div>
              <span className="text-muted-foreground">Location</span>
              <div className="font-semibold">{location}</div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Status</span>
            <div>
              <Badge
                variant={isOpen ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {isOpen ? "Open" : "Closed"}
              </Badge>
            </div>
          </div>
          {slug && (
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href={`/${slug}/catalog`}>
                <Package className="size-4" />
                Products
              </Link>
            </Button>
          )}
          {isAuthenticated && organizationId && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite || isFavorite === undefined}
            >
              <Heart
                className={
                  isFavorite
                    ? "size-5 fill-red-500 text-red-500"
                    : "size-5 text-muted-foreground"
                }
              />
            </Button>
          )}
        </div>
        {/* Mobile: products + status + favorite */}
        <div className="sm:hidden flex items-center gap-2">
          {slug && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="View products"
            >
              <Link href={`/${slug}/catalog`}>
                <Package className="size-4" />
              </Link>
            </Button>
          )}
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className="text-[10px] uppercase tracking-widest"
          >
            {isOpen ? "Open" : "Closed"}
          </Badge>
          {isAuthenticated && organizationId && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite || isFavorite === undefined}
            >
              <Heart
                className={
                  isFavorite
                    ? "size-5 fill-red-500 text-red-500"
                    : "size-5 text-muted-foreground"
                }
              />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
