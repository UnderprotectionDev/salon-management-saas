"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Organization = {
  _id: Id<"organization">;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  salonType?: Array<
    | "hair_women"
    | "hair_men"
    | "children"
    | "braiding"
    | "blowout_bar"
    | "hair_extensions"
    | "nail"
    | "makeup"
    | "skincare"
    | "lash_brow"
    | "permanent_makeup"
    | "threading"
    | "head_spa"
    | "spa"
    | "massage"
    | "hammam"
    | "sauna"
    | "ayurveda"
    | "float_therapy"
    | "waxing"
    | "tanning"
    | "laser"
    | "electrolysis"
    | "medspa"
    | "aesthetic_clinic"
    | "cryotherapy"
    | "iv_therapy"
    | "body_contouring"
    | "hair_loss"
    | "tattoo"
    | "piercing"
    | "henna"
    | "pet_grooming"
    | "beauty_center"
  > | null;
  role: "owner" | "staff";
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
  currentRole: "owner" | "staff" | null;
  // Loading state
  isLoading: boolean;
  // Set the active organization
  setActiveOrganization: (org: Organization | null) => void;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [activeOrgId, setActiveOrgId] = useState<Id<"organization"> | null>(
    null,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Listen for sign-out events to skip queries BEFORE token invalidation
  useEffect(() => {
    const handleSigningOut = () => {
      setIsSigningOut(true);
    };

    const handleSignedOut = () => {
      setIsSigningOut(false);
    };

    window.addEventListener("auth:signing-out", handleSigningOut);
    window.addEventListener("auth:signed-out", handleSignedOut);

    return () => {
      window.removeEventListener("auth:signing-out", handleSigningOut);
      window.removeEventListener("auth:signed-out", handleSignedOut);
    };
  }, []);

  // Skip the query when:
  // - Sign-out is in progress (most important - prevents race condition), OR
  // - Convex auth says not authenticated, OR
  // - Better Auth session is pending, OR
  // - Better Auth session is confirmed gone
  // This prevents UNAUTHENTICATED errors during sign-out.
  const shouldSkipQuery =
    isSigningOut || !isAuthenticated || isSessionPending || session === null;
  const organizationsData = useQuery(
    api.organizations.listForUser,
    shouldSkipQuery ? "skip" : {},
  );

  // Get current staff profile for the active organization
  // Skip if user is signing out or has no active organization
  const isMemberOfActiveOrg =
    activeOrgId &&
    organizationsData &&
    organizationsData.some((o) => o._id === activeOrgId);

  const currentStaff = useQuery(
    api.staff.getCurrentStaff,
    !shouldSkipQuery && isMemberOfActiveOrg
      ? { organizationId: activeOrgId }
      : "skip",
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
      description: org.description,
      salonType: org.salonType
        ? (org.salonType as Organization["salonType"])
        : null,
      role: org.role,
      memberId: org.memberId,
    }),
  );

  // Derive activeOrganization from ID + organizations array
  // When Convex reactive query updates organizations, this automatically reflects fresh data
  const activeOrganization = activeOrgId
    ? (organizations.find((o) => o._id === activeOrgId) ?? null)
    : null;

  // Clear active org and localStorage when user signs out
  // The isSigningOut guard prevents clearing during token refresh flickers
  useEffect(() => {
    if (
      isSigningOut ||
      !isAuthenticated ||
      (!isSessionPending && session === null)
    ) {
      setActiveOrgId(null);
      localStorage.removeItem("activeOrganizationId");
    }
  }, [isSigningOut, isAuthenticated, session, isSessionPending]);

  // Auto-set active organization if only one exists and none is set
  useEffect(() => {
    if (!isLoading && organizations.length > 0 && !activeOrgId) {
      // Try to restore from localStorage
      const savedOrgId = localStorage.getItem("activeOrganizationId");
      const savedOrg = savedOrgId
        ? organizations.find((o) => o._id === savedOrgId)
        : null;

      if (savedOrg) {
        setActiveOrgId(savedOrg._id);
      } else if (organizations.length === 1) {
        setActiveOrgId(organizations[0]._id);
        localStorage.setItem("activeOrganizationId", organizations[0]._id);
      }
    }
  }, [isLoading, organizations, activeOrgId]);

  const setActiveOrganization = (org: Organization | null) => {
    setActiveOrgId(org?._id ?? null);
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
