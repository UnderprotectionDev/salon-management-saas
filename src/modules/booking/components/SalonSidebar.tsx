"use client";

import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SalonSidebarProps = {
  logo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  phone?: string;
  email?: string;
};

export function SalonSidebar({
  logo,
  address,
  phone,
  email,
}: SalonSidebarProps) {
  const hasAddress = address && (address.street || address.city);
  const hasContact = phone || email;

  if (!hasAddress && !hasContact && !logo) return null;

  return (
    <aside className="hidden lg:block w-64 shrink-0 border-r">
      <div className="sticky top-[65px] p-6 space-y-8">
        {/* Address */}
        {hasAddress && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
              Address
            </h3>
            <div className="text-sm font-medium space-y-0.5">
              {address.street && <div>{address.street}</div>}
              {(address.city || address.state) && (
                <div>
                  {[address.city, address.state].filter(Boolean).join(", ")}
                </div>
              )}
              {address.postalCode && <div>{address.postalCode}</div>}
            </div>
          </div>
        )}

        {/* Contact */}
        {hasContact && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
              Contact
            </h3>
            <div className="text-sm font-medium space-y-1">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="block hover:underline"
                >
                  {phone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="block hover:underline uppercase text-xs"
                >
                  {email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Logo */}
        {logo && (
          <div className="pt-4">
            <Avatar className="size-20 border">
              <AvatarImage src={logo} alt="Salon logo" />
              <AvatarFallback>
                <Building2 className="size-8" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </aside>
  );
}
