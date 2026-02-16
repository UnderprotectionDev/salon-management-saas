"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Reactive hook that shows a toast when a new notification arrives.
 *
 * Subscribes to `notifications.getLatest` and compares the notification ID
 * against the previous one stored in a ref. When a new (unseen) notification
 * appears, it triggers a sonner toast with the notification title and message.
 *
 * Should be mounted once in the authenticated layout.
 */
export function useNotificationToast() {
  const { activeOrganization } = useOrganization();
  const prevIdRef = useRef<Id<"notifications"> | null>(null);
  const initializedRef = useRef(false);
  const orgIdRef = useRef<Id<"organization"> | null>(null);

  const latest = useQuery(
    api.notifications.getLatest,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  useEffect(() => {
    if (latest === undefined) return; // Still loading

    // Reset state when organization changes
    if (activeOrganization?._id !== orgIdRef.current) {
      orgIdRef.current = activeOrganization?._id ?? null;
      prevIdRef.current = latest?._id ?? null;
      initializedRef.current = true;
      return;
    }

    // On first load, just store the current ID without toasting
    if (!initializedRef.current) {
      prevIdRef.current = latest?._id ?? null;
      initializedRef.current = true;
      return;
    }

    // No notification or same as before
    if (!latest || latest._id === prevIdRef.current) return;

    // New notification detected
    prevIdRef.current = latest._id;

    toast(latest.title, {
      description: latest.message,
      duration: 5000,
    });
  }, [latest, activeOrganization?._id]);
}
