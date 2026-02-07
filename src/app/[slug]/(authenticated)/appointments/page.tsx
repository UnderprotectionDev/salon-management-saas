"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/modules/organization";
import { AppointmentList, CreateAppointmentDialog } from "@/modules/booking";

export default function AppointmentsPage() {
  const { activeOrganization, currentRole } = useOrganization();
  const isAdminOrOwner = currentRole === "owner" || currentRole === "admin";
  const [searchCode, setSearchCode] = useState("");

  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Appointments
          </h1>
          <p className="text-muted-foreground">
            Manage your salon appointments
          </p>
        </div>
        {isAdminOrOwner && (
          <CreateAppointmentDialog
            organizationId={activeOrganization._id}
            date={new Date().toLocaleDateString("en-CA")}
          />
        )}
      </div>

      {/* Search by confirmation code */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by confirmation code..."
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          className="pl-9"
        />
      </div>

      <AppointmentList
        organizationId={activeOrganization._id}
        searchCode={searchCode || undefined}
      />
    </div>
  );
}
