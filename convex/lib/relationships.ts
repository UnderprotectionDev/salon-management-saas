/**
 * Relationship Helpers
 *
 * Projene özel ilişki helper'ları. convex-helpers/server/relationships
 * üzerine kurulu, type-safe wrapper'lar.
 *
 * @example
 * // Organization'ın tüm staff'larını getir
 * const staff = await getOrgStaff(ctx.db, organizationId);
 *
 * // Member'ın staff profilini getir
 * const staffProfile = await getMemberStaff(ctx.db, memberId);
 */

import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

// =============================================================================
// Types
// =============================================================================

type DB = DatabaseReader;

// =============================================================================
// Organization Relationships
// =============================================================================

/**
 * Get all members of an organization
 * Organization → Member (One-to-Many)
 */
export async function getOrgMembers(
  db: DB,
  organizationId: Id<"organization">,
): Promise<Doc<"member">[]> {
  return getManyFrom(db, "member", "organizationId", organizationId);
}

/**
 * Get all staff of an organization
 * Organization → Staff (One-to-Many)
 */
export async function getOrgStaff(
  db: DB,
  organizationId: Id<"organization">,
): Promise<Doc<"staff">[]> {
  return getManyFrom(db, "staff", "organizationId", organizationId);
}

/**
 * Get active staff of an organization
 * Organization → Staff (One-to-Many, filtered)
 */
export async function getOrgActiveStaff(
  db: DB,
  organizationId: Id<"organization">,
): Promise<Doc<"staff">[]> {
  return db
    .query("staff")
    .withIndex("organizationId_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "active"),
    )
    .collect();
}

/**
 * Get all invitations of an organization
 * Organization → Invitation (One-to-Many)
 */
export async function getOrgInvitations(
  db: DB,
  organizationId: Id<"organization">,
): Promise<Doc<"invitation">[]> {
  return getManyFrom(db, "invitation", "organizationId", organizationId);
}

/**
 * Get pending invitations of an organization
 * Organization → Invitation (One-to-Many, filtered)
 */
export async function getOrgPendingInvitations(
  db: DB,
  organizationId: Id<"organization">,
): Promise<Doc<"invitation">[]> {
  const invitations = await getManyFrom(
    db,
    "invitation",
    "organizationId",
    organizationId,
  );
  return invitations.filter((inv) => inv.status === "pending");
}

/**
 * Get organization settings
 * Organization → OrganizationSettings (One-to-One)
 */
export async function getOrgSettings(
  db: DB,
  organizationId: Id<"organization">,
): Promise<Doc<"organizationSettings"> | null> {
  return getOneFrom(
    db,
    "organizationSettings",
    "organizationId",
    organizationId,
  );
}

// =============================================================================
// Member Relationships
// =============================================================================

/**
 * Get staff profile for a member
 * Member → Staff (One-to-One)
 */
export async function getMemberStaff(
  db: DB,
  memberId: Id<"member">,
): Promise<Doc<"staff"> | null> {
  return getOneFrom(db, "staff", "memberId", memberId);
}

/**
 * Get member's organization
 * Member → Organization (Many-to-One)
 */
export async function getMemberOrg(
  db: DB,
  memberId: Id<"member">,
): Promise<Doc<"organization"> | null> {
  const member = await db.get(memberId);
  if (!member) return null;
  return db.get(member.organizationId);
}

// =============================================================================
// User Relationships (by userId string)
// =============================================================================

/**
 * Get all memberships for a user
 * User → Member (One-to-Many)
 */
export async function getUserMemberships(
  db: DB,
  userId: string,
): Promise<Doc<"member">[]> {
  return db
    .query("member")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
}

/**
 * Get all staff profiles for a user
 * User → Staff (One-to-Many)
 */
export async function getUserStaffProfiles(
  db: DB,
  userId: string,
): Promise<Doc<"staff">[]> {
  return db
    .query("staff")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
}

/**
 * Get user's membership in a specific organization
 * User + Organization → Member (lookup)
 */
export async function getUserOrgMembership(
  db: DB,
  userId: string,
  organizationId: Id<"organization">,
): Promise<Doc<"member"> | null> {
  return db
    .query("member")
    .withIndex("organizationId_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .first();
}

/**
 * Get user's staff profile in a specific organization
 * User + Organization → Staff (lookup)
 */
export async function getUserOrgStaff(
  db: DB,
  userId: string,
  organizationId: Id<"organization">,
): Promise<Doc<"staff"> | null> {
  return db
    .query("staff")
    .withIndex("organizationId_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .first();
}

// =============================================================================
// Aggregated Relationships
// =============================================================================

/**
 * Get all organizations a user belongs to (with membership details)
 * User → Organizations (via Member)
 */
export async function getUserOrganizations(
  db: DB,
  userId: string,
): Promise<
  Array<
    Doc<"organization"> & {
      role: Doc<"member">["role"];
      memberId: Id<"member">;
    }
  >
> {
  const memberships = await getUserMemberships(db, userId);

  const organizations = await Promise.all(
    memberships.map(async (m) => {
      const org = await db.get(m.organizationId);
      return org
        ? {
            ...org,
            role: m.role,
            memberId: m._id,
          }
        : null;
    }),
  );

  return organizations.filter(
    (org): org is NonNullable<typeof org> => org !== null,
  );
}

/**
 * Get organization with all related data
 * Useful for organization detail pages
 */
export async function getOrgWithDetails(
  db: DB,
  organizationId: Id<"organization">,
): Promise<{
  organization: Doc<"organization">;
  settings: Doc<"organizationSettings"> | null;
  members: Doc<"member">[];
  staff: Doc<"staff">[];
  pendingInvitations: Doc<"invitation">[];
} | null> {
  const organization = await db.get(organizationId);
  if (!organization) return null;

  const [settings, members, staff, pendingInvitations] = await Promise.all([
    getOrgSettings(db, organizationId),
    getOrgMembers(db, organizationId),
    getOrgStaff(db, organizationId),
    getOrgPendingInvitations(db, organizationId),
  ]);

  return {
    organization,
    settings,
    members,
    staff,
    pendingInvitations,
  };
}
