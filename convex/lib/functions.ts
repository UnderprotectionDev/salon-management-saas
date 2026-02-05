import { v } from "convex/values";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import type { Doc, Id } from "../_generated/dataModel";
import {
  mutation as baseMutation,
  query as baseQuery,
} from "../_generated/server";
import { authComponent } from "../auth";

// =============================================================================
// Types
// =============================================================================

export type Role = "owner" | "admin" | "member";

type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.getAuthUser>>
>;

type MemberDoc = Doc<"member">;
type StaffDoc = Doc<"staff">;

// Extended context types
export type AuthedCtx = {
  user: AuthUser;
};

export type OrgCtx = AuthedCtx & {
  organizationId: Id<"organization">;
  member: MemberDoc;
  staff: StaffDoc | null;
};

export type AdminCtx = OrgCtx & {
  role: Role;
};

// =============================================================================
// Helper Functions
// =============================================================================

async function getAuthUser(ctx: { db: unknown; auth: unknown }) {
  const user = await authComponent.getAuthUser(
    ctx as Parameters<typeof authComponent.getAuthUser>[0],
  );
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

// =============================================================================
// Public Query (No Auth Required)
// =============================================================================

/**
 * Query that does NOT require authentication.
 * Use for public data like organization info by slug.
 *
 * @example
 * export const getBySlug = publicQuery({
 *   args: { slug: v.string() },
 *   handler: async (ctx, args) => {
 *     return await ctx.db.query("organization")
 *       .withIndex("slug", q => q.eq("slug", args.slug))
 *       .first();
 *   },
 * });
 */
export const publicQuery = customQuery(baseQuery, {
  args: {},
  input: async (_ctx, _args) => {
    return { ctx: {}, args: {} };
  },
});

// =============================================================================
// Maybe Authenticated Query
// Returns user if authenticated, null otherwise (doesn't throw)
// =============================================================================

/**
 * Query that optionally uses authentication.
 * Returns `ctx.user` if authenticated, `null` otherwise.
 * Does NOT throw if user is not authenticated.
 *
 * Use for queries that should work for both authenticated and unauthenticated users,
 * or for queries called before auth state is determined.
 *
 * @example
 * export const listForUser = maybeAuthedQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     if (!ctx.user) return []; // Not authenticated
 *     return await ctx.db.query("member")...
 *   },
 * });
 */
export const maybeAuthedQuery = customQuery(baseQuery, {
  args: {},
  input: async (ctx, _args) => {
    try {
      const user = await authComponent.getAuthUser(
        ctx as Parameters<typeof authComponent.getAuthUser>[0],
      );
      return { ctx: { user }, args: {} };
    } catch {
      // User not authenticated - return null
      return { ctx: { user: null }, args: {} };
    }
  },
});

// =============================================================================
// Authenticated Query/Mutation
// Just requires login, adds user to context
// =============================================================================

/**
 * Query that requires authentication.
 * Adds `ctx.user` to the handler.
 *
 * @example
 * export const getMyProfile = authedQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     // ctx.user is guaranteed to exist
 *     return ctx.user;
 *   },
 * });
 */
export const authedQuery = customQuery(baseQuery, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getAuthUser(ctx);
    return { ctx: { user }, args: {} };
  },
});

/**
 * Mutation that requires authentication.
 * Adds `ctx.user` to the handler.
 */
export const authedMutation = customMutation(baseMutation, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getAuthUser(ctx);
    return { ctx: { user }, args: {} };
  },
});

// =============================================================================
// Organization Query/Mutation
// Requires login + organization membership
// =============================================================================

/**
 * Query that requires authentication AND organization membership.
 * Adds `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` to handler.
 *
 * @example
 * export const listStaff = orgQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     // ctx.organizationId is automatically available
 *     return await ctx.db.query("staff")
 *       .withIndex("organizationId", q => q.eq("organizationId", ctx.organizationId))
 *       .collect();
 *   },
 * });
 */
export const orgQuery = customQuery(baseQuery, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check member record for RBAC
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    // Also get staff profile if exists
    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    return {
      ctx: {
        user,
        organizationId: args.organizationId,
        member,
        staff,
      },
      args: {},
    };
  },
});

/**
 * Mutation that requires authentication AND organization membership.
 * Adds `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` to handler.
 */
export const orgMutation = customMutation(baseMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    return {
      ctx: {
        user,
        organizationId: args.organizationId,
        member,
        staff,
      },
      args: {},
    };
  },
});

// =============================================================================
// Admin Query/Mutation
// Requires login + organization membership + admin or owner role
// =============================================================================

/**
 * Query that requires admin or owner role.
 * Adds `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff`, `ctx.role`.
 *
 * @example
 * export const getSecrets = adminQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     // Only owner/admin can access
 *     return await ctx.db.query("secrets")
 *       .withIndex("organizationId", q => q.eq("organizationId", ctx.organizationId))
 *       .collect();
 *   },
 * });
 */
export const adminQuery = customQuery(baseQuery, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    if (!["owner", "admin"].includes(member.role)) {
      throw new Error("Admin access required");
    }

    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    return {
      ctx: {
        user,
        organizationId: args.organizationId,
        member,
        staff,
        role: member.role as Role,
      },
      args: {},
    };
  },
});

/**
 * Mutation that requires admin or owner role.
 * Adds `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff`, `ctx.role`.
 */
export const adminMutation = customMutation(baseMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    if (!["owner", "admin"].includes(member.role)) {
      throw new Error("Admin access required");
    }

    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    return {
      ctx: {
        user,
        organizationId: args.organizationId,
        member,
        staff,
        role: member.role as Role,
      },
      args: {},
    };
  },
});

// =============================================================================
// Owner-Only Query/Mutation
// Requires login + organization membership + owner role
// =============================================================================

/**
 * Query that requires owner role only.
 * Use for critical operations like billing, deleting org, etc.
 */
export const ownerQuery = customQuery(baseQuery, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    if (member.role !== "owner") {
      throw new Error("Owner access required");
    }

    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    return {
      ctx: {
        user,
        organizationId: args.organizationId,
        member,
        staff,
        role: "owner" as const,
      },
      args: {},
    };
  },
});

/**
 * Mutation that requires owner role only.
 * Use for critical operations like billing, deleting org, etc.
 */
export const ownerMutation = customMutation(baseMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    if (member.role !== "owner") {
      throw new Error("Owner access required");
    }

    const staff = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id),
      )
      .first();

    return {
      ctx: {
        user,
        organizationId: args.organizationId,
        member,
        staff,
        role: "owner" as const,
      },
      args: {},
    };
  },
});
