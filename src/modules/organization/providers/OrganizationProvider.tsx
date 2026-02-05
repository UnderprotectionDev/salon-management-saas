"use client";

import { useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Organization = {
  _id: Id<"organization">;
  name: string;
  slug: string;
  logo?: string | null;
  role: "owner" | "admin" | "member";
  memberId: Id<"member">;
};

type Staff = {
  _id: Id<"staff">;
  organizationId: Id<"organization">;
  name: string;
  status: "active" | "inactive" | "pending";
};

type OrganizationContextType = {
  // Current active organization
  activeOrganization: Organization | null;
  // All organizations the user belongs to
  organizations: Organization[];
  // Current user's staff profile in active org
  currentStaff: Staff | null;
  // Current user's role in active org
  currentRole: "owner" | "admin" | "member" | null;
  // Loading state
  isLoading: boolean;
  // Set the active organization
  setActiveOrganization: (org: Organization | null) => void;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [activeOrganization, setActiveOrgState] = useState<Organization | null>(
    null,
  );

  // Get organizations from Convex
  const organizationsData = useQuery(api.organizations.listForUser);

  // Get current staff profile for the active organization
  const currentStaff = useQuery(
    api.staff.getCurrentStaff,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  // Determine loading state
  const isLoading = organizationsData === undefined;

  // Map organizations data - filter out any nulls first for type safety
  const organizations: Organization[] = (organizationsData ?? []).map(
    (org) => ({
      _id: org._id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      role: org.role,
      memberId: org.memberId,
    }),
  );

  // Auto-set active organization if only one exists and none is set
  useEffect(() => {
    if (!isLoading && organizations.length > 0 && !activeOrganization) {
      // Try to restore from localStorage
      const savedOrgId = localStorage.getItem("activeOrganizationId");
      const savedOrg = savedOrgId
        ? organizations.find((o) => o._id === savedOrgId)
        : null;

      if (savedOrg) {
        setActiveOrgState(savedOrg);
      } else if (organizations.length === 1) {
        setActiveOrgState(organizations[0]);
        localStorage.setItem("activeOrganizationId", organizations[0]._id);
      }
    }
  }, [isLoading, organizations, activeOrganization]);

  const setActiveOrganization = (org: Organization | null) => {
    setActiveOrgState(org);
    if (org) {
      localStorage.setItem("activeOrganizationId", org._id);
    } else {
      localStorage.removeItem("activeOrganizationId");
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        activeOrganization,
        organizations,
        currentStaff: currentStaff ?? null,
        currentRole: activeOrganization?.role ?? null,
        isLoading,
        setActiveOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}

export function useActiveOrganization() {
  const { activeOrganization } = useOrganization();
  return activeOrganization;
}

export function useOrganizations() {
  const { organizations } = useOrganization();
  return organizations;
}

export function useCurrentStaff() {
  const { currentStaff } = useOrganization();
  return currentStaff;
}

export function useCurrentRole() {
  const { currentRole } = useOrganization();
  return currentRole;
}
