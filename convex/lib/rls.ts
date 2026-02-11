import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

export type Role = "owner" | "staff";

/**
 * Get the currently authenticated user
 * @returns The authenticated user or null if not authenticated
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  return authComponent.getAuthUser(ctx);
}

/**
 * Get the currently authenticated user or throw an error
 * @throws Error if user is not authenticated
 *
 * @deprecated Use authedQuery/authedMutation from lib/functions.ts instead
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

/**
 * Get the user's membership in an organization
 * @returns The staff record or null if not a member
 */
export async function getMembership(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  organizationId: Id<"organization">,
) {
  const staff = await ctx.db
    .query("staff")
    .withIndex("organizationId_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .first();

  return staff;
}

/**
 * Check if user is an owner of the organization
 */
export async function isOwner(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organization">,
): Promise<boolean> {
  try {
    const user = await getCurrentUser(ctx);
    if (!user) return false;

    const memberRecord = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", organizationId).eq("userId", user._id),
      )
      .first();

    return memberRecord?.role === "owner";
  } catch {
    return false;
  }
}

/**
 * Get all organizations the current user is a member of
 */
export async function getUserOrganizations(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);

  const staffRecords = await ctx.db
    .query("staff")
    .withIndex("userId", (q) => q.eq("userId", user._id))
    .collect();

  return staffRecords.map((s) => s.organizationId);
}
