import { ConvexError, v } from "convex/values";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
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

type CtxWithDb =
  | (QueryCtx & Parameters<typeof authComponent.getAuthUser>[0])
  | (MutationCtx & Parameters<typeof authComponent.getAuthUser>[0]);

async function getAuthUser(
  ctx: CtxWithDb,
  options?: { skipBanCheck?: boolean },
): Promise<AuthUser> {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new ConvexError({
      code: ErrorCode.UNAUTHENTICATED,
      message: "Authentication required",
    });
  }

  if (!options?.skipBanCheck && !isSuperAdminEmail(user.email)) {
    const banned = await ctx.db
      .query("bannedUsers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (banned) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Your account has been suspended",
      });
    }
  }

  return user;
}

const triggerMutation = customMutation(
  baseMutation,
  customCtx(triggers.wrapDB),
);

export const publicQuery = customQuery(baseQuery, {
  args: {},
  input: async (_ctx, args) => {
    return { ctx: {}, args };
  },
});

export const authedQuery = customQuery(baseQuery, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getAuthUser(ctx);
    return { ctx: { user }, args: {} };
  },
});

export const authedMutation = customMutation(triggerMutation, {
  args: {},
  input: async (ctx, _args) => {
    const user = await getAuthUser(ctx);
    return { ctx: { user }, args: {} };
  },
});

async function resolveOrgContext(
  ctx: CtxWithDb,
  user: AuthUser,
  organizationId: Id<"organization">,
) {
  const member = await ctx.db
    .query("member")
    .withIndex("organizationId_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", user._id),
    )
    .first();

  const staff = member
    ? await ctx.db
        .query("staff")
        .withIndex("organizationId_userId", (q) =>
          q.eq("organizationId", organizationId).eq("userId", user._id),
        )
        .first()
    : null;

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

export const internalMutation = baseInternalMutation;

export { isSuperAdminEmail };
