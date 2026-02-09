"use client";

import { CalendarDays, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAppointmentDialog } from "@/modules/booking";
import { useOrganization } from "@/modules/organization";

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function QuickActions() {
  const { activeOrganization } = useOrganization();
  const slug = activeOrganization?.slug;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks for your salon</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {activeOrganization && (
          <CreateAppointmentDialog
            organizationId={activeOrganization._id}
            date={getToday()}
          />
        )}
        {slug && (
          <Link href={`/${slug}/calendar`}>
            <Button variant="outline" className="w-full justify-start">
              <CalendarDays className="mr-2 size-4" />
              View Calendar
            </Button>
          </Link>
        )}
        {slug && (
          <Link href={`/${slug}/settings?tab=team`}>
            <Button variant="outline" className="w-full justify-start">
              <UserPlus className="mr-2 size-4" />
              Invite Team Members
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
