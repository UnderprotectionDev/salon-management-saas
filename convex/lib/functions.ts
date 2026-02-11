import { ConvexError, v } from "convex/values";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation as baseInternalMutation,
  mutation as baseMutation,
  query as baseQuery,
} from "../_generated/server";
import { authComponent } from "../auth";
import { triggers } from "./triggers";

export const ErrorCode = {
  // Authentication errors
  UNAUTHENTICATED: "UNAUTHENTICATED",
  // Authorization errors
  FORBIDDEN: "FORBIDDEN",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",
  OWNER_REQUIRED: "OWNER_REQUIRED",
  SUPER_ADMIN_REQUIRED: "SUPER_ADMIN_REQUIRED",
  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  // General errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type Role = "owner" | "staff";

type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.getAuthUser>>
>;

type MemberDoc = Doc<"member">;
type StaffDoc = Doc<"staff">;

export type AuthedCtx = {
  user: AuthUser;
};

export type OrgCtx = AuthedCtx & {
  organizationId: Id<"organization">;
  member: MemberDoc;
  staff: StaffDoc | null;
};

export type OwnerCtx = OrgCtx & {
  role: "owner";
};

export type SuperAdminCtx = AuthedCtx & {
  isSuperAdmin: true;
};

function isSuperAdminEmail(email: string): boolean {
  const emails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return emails.includes(email);
}

async function getAuthUser(
  ctx: Parameters<typeof authComponent.getAuthUser>[0],
  options?: { skipBanCheck?: boolean },
): Promise<AuthUser> {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new ConvexError({
      code: ErrorCode.UNAUTHENTICATED,
      message: "Authentication required",
    });
  }

  // Check if user is banned (skip for superadmins)
  if (!options?.skipBanCheck && !isSuperAdminEmail(user.email)) {
    const db = (ctx as any).db;
    if (db) {
      const banned = await db
        .query("bannedUsers")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();
      if (banned) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message: "Your account has been suspended",
        });
      }
    }
  }

  return user;
}

export const publicQuery = customQuery(baseQuery, {
  args: {},
  input: async (_ctx, args) => {
    return { ctx: {}, args };
  },
});

const triggerMutation = customMutation(
  baseMutation,
  customCtx(triggers.wrapDB),
);

export const publicMutation = customMutation(triggerMutation, {
  args: {},
  input: async (_ctx, _args) => {
    return { ctx: {}, args: {} };
  },
});

export const maybeAuthedQuery = customQuery(baseQuery, {
  args: {},
  input: async (ctx, _args) => {
    try {
      const user = await authComponent.getAuthUser(
        ctx as Parameters<typeof authComponent.getAuthUser>[0],
      );
      return { ctx: { user: user as AuthUser | null }, args: {} };
    } catch {
      // User not authenticated - return null
      return { ctx: { user: null as AuthUser | null }, args: {} };
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
export const authedMutation = customMutation(triggerMutation, {
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
/**
 * Shared helper: resolve org context with SuperAdmin bypass.
 * SuperAdmins get a synthetic owner member if they're not an actual member.
 */
async function resolveOrgContext(
  ctx: any,
  user: AuthUser,
  organizationId: Id<"organization">,
) {
  const member = await ctx.db
    .query("member")
    .withIndex("organizationId_userId", (q: any) =>
      q.eq("organizationId", organizationId).eq("userId", user._id),
    )
    .first();

  const staff = member
    ? await ctx.db
        .query("staff")
        .withIndex("organizationId_userId", (q: any) =>
          q.eq("organizationId", organizationId).eq("userId", user._id),
        )
        .first()
    : null;

  // SuperAdmin bypass: create synthetic owner member if not a real member
  if (!member && isSuperAdminEmail(user.email)) {
    return {
      member: {
        _id: "superadmin" as Id<"member">,
        _creationTime: 0,
        organizationId,
        userId: user._id,
        role: "owner" as const,
        createdAt: 0,
        updatedAt: 0,
      } as MemberDoc,
      staff: null as StaffDoc | null,
    };
  }

  return { member, staff };
}

export const orgQuery = customQuery(baseQuery, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(
      ctx,
      user,
      args.organizationId,
    );

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    return {
      ctx: { user, organizationId: args.organizationId, member, staff },
      args: {},
    };
  },
});

/**
 * Mutation that requires authentication AND organization membership.
 * Adds `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` to handler.
 */
export const orgMutation = customMutation(triggerMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(
      ctx,
      user,
      args.organizationId,
    );

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    return {
      ctx: { user, organizationId: args.organizationId, member, staff },
      args: {},
    };
  },
});

// =============================================================================
// Admin Query/Mutation
// Requires login + organization membership + owner role
// =============================================================================

/**
 * Query that requires owner role.
 * SuperAdmins bypass the role check.
 */
export const adminQuery = customQuery(baseQuery, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(
      ctx,
      user,
      args.organizationId,
    );

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    if (member.role !== "owner" && !isSuperAdminEmail(user.email)) {
      throw new ConvexError({
        code: ErrorCode.ADMIN_REQUIRED,
        message: "Admin access required",
      });
    }

    return {
      ctx: { user, organizationId: args.organizationId, member, staff },
      args: {},
    };
  },
});

/**
 * Mutation that requires owner role.
 * SuperAdmins bypass the role check.
 */
export const adminMutation = customMutation(triggerMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(
      ctx,
      user,
      args.organizationId,
    );

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    if (member.role !== "owner" && !isSuperAdminEmail(user.email)) {
      throw new ConvexError({
        code: ErrorCode.ADMIN_REQUIRED,
        message: "Admin access required",
      });
    }

    return {
      ctx: { user, organizationId: args.organizationId, member, staff },
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
 * SuperAdmins bypass the owner role check.
 */
export const ownerQuery = customQuery(baseQuery, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(
      ctx,
      user,
      args.organizationId,
    );

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    if (member.role !== "owner" && !isSuperAdminEmail(user.email)) {
      throw new ConvexError({
        code: ErrorCode.OWNER_REQUIRED,
        message: "Owner access required",
      });
    }

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
 * SuperAdmins bypass the owner role check.
 */
export const ownerMutation = customMutation(triggerMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(
      ctx,
      user,
      args.organizationId,
    );

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    if (member.role !== "owner" && !isSuperAdminEmail(user.email)) {
      throw new ConvexError({
        code: ErrorCode.OWNER_REQUIRED,
        message: "Owner access required",
      });
    }

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

// =============================================================================
// SuperAdmin Query/Mutation
// Requires login + email in SUPER_ADMIN_EMAILS env var
// =============================================================================

/**
 * Query that requires SuperAdmin access.
 * Checks user email against SUPER_ADMIN_EMAILS env var.
 */
export const superAdminQuery = customQuery(baseQuery, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getAuthUser(ctx, { skipBanCheck: true });

    if (!isSuperAdminEmail(user.email)) {
      throw new ConvexError({
        code: ErrorCode.SUPER_ADMIN_REQUIRED,
        message: "SuperAdmin access required",
      });
    }

    return {
      ctx: { user, isSuperAdmin: true as const },
      args: {},
    };
  },
});

/**
 * Mutation that requires SuperAdmin access.
 * Checks user email against SUPER_ADMIN_EMAILS env var.
 */
export const superAdminMutation = customMutation(triggerMutation, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getAuthUser(ctx, { skipBanCheck: true });

    if (!isSuperAdminEmail(user.email)) {
      throw new ConvexError({
        code: ErrorCode.SUPER_ADMIN_REQUIRED,
        message: "SuperAdmin access required",
      });
    }

    return {
      ctx: { user, isSuperAdmin: true as const },
      args: {},
    };
  },
});

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Internal mutation - for system/cron jobs only
 * Re-export from base for consistency
 */
export const internalMutation = baseInternalMutation;

// Re-export for admin.ts
export { isSuperAdminEmail };
