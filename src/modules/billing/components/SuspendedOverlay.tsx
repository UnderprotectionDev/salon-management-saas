"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/modules/billing/hooks/useSubscriptionStatus";

export function SuspendedOverlay() {
  const { activeOrganization, isPendingPayment, isSuspended, subscription } =
    useSubscriptionStatus();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLAnchorElement>(null);

  // Don't block the billing page itself
  const billingPath = activeOrganization
    ? `/${activeOrganization.slug}/billing`
    : null;
  const isBillingPage = billingPath ? pathname === billingPath : false;
  const shouldShow =
    !isBillingPage &&
    !!subscription &&
    (isSuspended || isPendingPayment) &&
    !!activeOrganization;

  // Focus trap: move focus to the overlay when it appears
  useEffect(() => {
    if (shouldShow && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [shouldShow]);

  // Trap keyboard focus within the overlay
  useEffect(() => {
    if (!shouldShow) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") {
        // Keep focus on the button (only focusable element)
        e.preventDefault();
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shouldShow]);

  if (!shouldShow || !activeOrganization) {
    return null;
  }

  const headingId = "suspended-overlay-title";
  const descriptionId = "suspended-overlay-description";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-md text-center">
        <ShieldAlert
          className="mx-auto mb-4 size-16 text-destructive"
          aria-hidden="true"
        />
        <h2 id={headingId} className="mb-2 text-2xl font-bold">
          {isPendingPayment ? "Subscription Required" : "Account Suspended"}
        </h2>
        <p id={descriptionId} className="mb-6 text-muted-foreground">
          {isPendingPayment
            ? "Please complete your subscription to get started."
            : "Your salon's subscription has been suspended. Please update your billing information to restore access."}
        </p>
        <Button asChild>
          <Link ref={buttonRef} href={`/${activeOrganization.slug}/billing`}>
            Go to Billing
          </Link>
        </Button>
      </div>
    </div>
  );
}
