"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Id } from "../../../../convex/_generated/dataModel";

export function BookAgainButton({
  organizationSlug,
  serviceIds,
  staffId,
}: {
  organizationSlug: string;
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
}) {
  const params = new URLSearchParams();
  if (serviceIds.length > 0) {
    params.set("services", serviceIds.join(","));
  }
  if (staffId) {
    params.set("staff", staffId);
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${organizationSlug}/book?${params.toString()}`}>
        <RotateCcw className="size-3.5 mr-1.5" />
        Book Again
      </Link>
    </Button>
  );
}
