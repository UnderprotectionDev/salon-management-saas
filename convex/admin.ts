import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import {
  ErrorCode,
  authedQuery,
  isSuperAdminEmail,
  superAdminMutation,
  superAdminQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  adminActionLogValidator,
  adminOrgListItemValidator,
  adminUserListItemValidator,
  platformStatsValidator,
} from "./lib/validators";

// =============================================================================
// SuperAdmin Check
// =============================================================================

/**
 * Simple boolean query for frontend to check if current user is superadmin.
 */
export const checkIsSuperAdmin = authedQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    return isSuperAdminEmail(ctx.user.email);
  },
});

// =============================================================================
// Platform Stats
// =============================================================================

export const getPlatformStats = superAdminQuery({
  args: {},
  returns: platformStatsValidator,
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Count organizations
    const allOrgs = await ctx.db.query("organization").collect();
    const totalOrganizations = allOrgs.length;

    // Active orgs (have at least one non-suspended setting)
    const allSettings = await ctx.db.query("organizationSettings").collect();
    const settingsMap = new Map(allSettings.map((s) => [s.organizationId, s]));
    const activeOrganizations = allOrgs.filter((org) => {
      const settings = settingsMap.get(org._id);
      return (
        !settings ||
        (settings.subscriptionStatus !== "suspended" &&
          settings.subscriptionStatus !== "canceled")
      );
    }).length;

    // Count members (unique users)
    const allMembers = await ctx.db.query("member").collect();
    const uniqueUserIds = new Set(allMembers.map((m) => m.userId));
    const totalUsers = uniqueUserIds.size;

    // Count appointments
    const allAppointments = await ctx.db.query("appointments").collect();
    const totalAppointments = allAppointments.length;

    // Total revenue (completed appointments)
    const totalRevenue = allAppointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + a.total, 0);

    // Last 30 days stats
    const recentOrgs = allOrgs.filter(
      (o) => o.createdAt >= thirtyDaysAgo,
    ).length;
    const recentMembers = allMembers.filter(
      (m) => m.createdAt >= thirtyDaysAgo,
    );
    const recentUniqueUsers = new Set(recentMembers.map((m) => m.userId)).size;
    const recentAppointments = allAppointments.filter(
      (a) => a.createdAt >= thirtyDaysAgo,
    );
    const recentRevenue = recentAppointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + a.total, 0);

    return {
      totalUsers,
      totalOrganizations,
      activeOrganizations,
      totalAppointments,
      totalRevenue,
      last30Days: {
        newUsers: recentUniqueUsers,
        newOrganizations: recentOrgs,
        appointments: recentAppointments.length,
        revenue: recentRevenue,
      },
    };
  },
});

// =============================================================================
// Organization Management
// =============================================================================

export const listAllOrganizations = superAdminQuery({
  args: {
    search: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
  },
  returns: v.array(adminOrgListItemValidator),
  handler: async (ctx, args) => {
    const allOrgs = await ctx.db.query("organization").collect();
    const allMembers = await ctx.db.query("member").collect();
    const allCustomers = await ctx.db.query("customers").collect();
    const allAppointments = await ctx.db.query("appointments").collect();
    const allSettings = await ctx.db.query("organizationSettings").collect();

    // Build lookup maps
    const membersByOrg = new Map<Id<"organization">, typeof allMembers>();
    for (const m of allMembers) {
      const list = membersByOrg.get(m.organizationId) ?? [];
      list.push(m);
      membersByOrg.set(m.organizationId, list);
    }

    const customerCountByOrg = new Map<Id<"organization">, number>();
    for (const c of allCustomers) {
      customerCountByOrg.set(
        c.organizationId,
        (customerCountByOrg.get(c.organizationId) ?? 0) + 1,
      );
    }

    const appointmentsByOrg = new Map<
      Id<"organization">,
      typeof allAppointments
    >();
    for (const a of allAppointments) {
      const list = appointmentsByOrg.get(a.organizationId) ?? [];
      list.push(a);
      appointmentsByOrg.set(a.organizationId, list);
    }

    const settingsByOrg = new Map(
      allSettings.map((s) => [s.organizationId, s]),
    );

    // Resolve owner info
    const ownerCache = new Map<
      string,
      { name: string; email: string } | null
    >();

    const results = [];

    for (const org of allOrgs) {
      const members = membersByOrg.get(org._id) ?? [];
      const ownerMember = members.find((m) => m.role === "owner");
      const settings = settingsByOrg.get(org._id);
      const orgAppointments = appointmentsByOrg.get(org._id) ?? [];
      const revenue = orgAppointments
        .filter((a) => a.status === "completed")
        .reduce((sum, a) => sum + a.total, 0);

      let ownerName: string | null = null;
      let ownerEmail: string | null = null;

      if (ownerMember) {
        if (!ownerCache.has(ownerMember.userId)) {
          const user = await authComponent.getAnyUserById(
            ctx,
            ownerMember.userId,
          );
          ownerCache.set(
            ownerMember.userId,
            user ? { name: user.name, email: user.email } : null,
          );
        }
        const cached = ownerCache.get(ownerMember.userId);
        ownerName = cached?.name ?? null;
        ownerEmail = cached?.email ?? null;
      }

      // Apply search filter
      if (args.search) {
        const q = args.search.toLowerCase();
        if (
          !org.name.toLowerCase().includes(q) &&
          !org.slug.toLowerCase().includes(q) &&
          !(ownerEmail ?? "").toLowerCase().includes(q)
        ) {
          continue;
        }
      }

      // Apply status filter
      if (args.statusFilter) {
        const status = settings?.subscriptionStatus ?? null;
        if (status !== args.statusFilter) continue;
      }

      results.push({
        _id: org._id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        ownerName,
        ownerEmail,
        memberCount: members.length,
        customerCount: customerCountByOrg.get(org._id) ?? 0,
        appointmentCount: orgAppointments.length,
        revenue,
        subscriptionStatus: settings?.subscriptionStatus ?? null,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const suspendOrganization = superAdminMutation({
  args: {
    organizationId: v.id("organization"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "suspendOrganization", {
      key: ctx.user._id,
    });

    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (!settings) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization settings not found",
      });
    }

    await ctx.db.patch(settings._id, {
      subscriptionStatus: "suspended",
      suspendedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("adminActions", {
      adminUserId: ctx.user._id,
      adminEmail: ctx.user.email,
      action: "suspend_org",
      targetType: "organization",
      targetId: args.organizationId,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const unsuspendOrganization = superAdminMutation({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (!settings) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization settings not found",
      });
    }

    await ctx.db.patch(settings._id, {
      subscriptionStatus: "active",
      suspendedAt: undefined,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("adminActions", {
      adminUserId: ctx.user._id,
      adminEmail: ctx.user.email,
      action: "unsuspend_org",
      targetType: "organization",
      targetId: args.organizationId,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const deleteOrganization = superAdminMutation({
  args: {
    organizationId: v.id("organization"),
    confirmSlug: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "deleteOrganization", {
      key: ctx.user._id,
    });

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization not found",
      });
    }

    if (org.slug !== args.confirmSlug) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Slug confirmation does not match",
      });
    }

    // Helper to delete all docs matching organizationId filter
    async function deleteByOrgId<T extends { _id: any }>(docs: T[]) {
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    // Delete members
    const members = await ctx.db
      .query("member")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(members);

    // Delete staff
    const staffDocs = await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(staffDocs);

    // Delete invitations
    const invitations = await ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(invitations);

    // Delete services
    const services = await ctx.db
      .query("services")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(services);

    // Delete service categories
    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(categories);

    // Delete customers
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(customers);

    // Delete appointments and their services
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    for (const appt of appointments) {
      const apptServices = await ctx.db
        .query("appointmentServices")
        .withIndex("by_appointment", (q) => q.eq("appointmentId", appt._id))
        .collect();
      await deleteByOrgId(apptServices);
    }
    await deleteByOrgId(appointments);

    // Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
    await deleteByOrgId(notifications);

    // Delete schedule overrides
    const overrides = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(overrides);

    // Delete staff overtime
    const overtime = await ctx.db
      .query("staffOvertime")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    await deleteByOrgId(overtime);

    // Delete time off requests
    const timeOffRequests = await ctx.db
      .query("timeOffRequests")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
    await deleteByOrgId(timeOffRequests);

    // Delete slot locks
    const slotLocks = await ctx.db
      .query("slotLocks")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
    await deleteByOrgId(slotLocks);

    // Delete settings
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // Delete the organization itself
    await ctx.db.delete(args.organizationId);

    // Log action
    await ctx.db.insert("adminActions", {
      adminUserId: ctx.user._id,
      adminEmail: ctx.user.email,
      action: "delete_org",
      targetType: "organization",
      targetId: args.organizationId,
      reason: `Deleted org: ${org.name} (${org.slug})`,
      createdAt: Date.now(),
    });

    return null;
  },
});

// =============================================================================
// User Management
// =============================================================================

export const listAllUsers = superAdminQuery({
  args: {
    search: v.optional(v.string()),
  },
  returns: v.array(adminUserListItemValidator),
  handler: async (ctx, args) => {
    // Get all members to find unique users
    const allMembers = await ctx.db.query("member").collect();
    const uniqueUserIds = [...new Set(allMembers.map((m) => m.userId))];

    // Get banned users
    const bannedUsers = await ctx.db.query("bannedUsers").collect();
    const bannedSet = new Set(bannedUsers.map((b) => b.userId));

    // Count orgs per user
    const orgCountByUser = new Map<string, number>();
    for (const m of allMembers) {
      orgCountByUser.set(m.userId, (orgCountByUser.get(m.userId) ?? 0) + 1);
    }

    const results = [];

    for (const userId of uniqueUserIds) {
      const user = await authComponent.getAnyUserById(ctx, userId);
      if (!user) continue;

      // Apply search filter
      if (args.search) {
        const q = args.search.toLowerCase();
        if (
          !user.name.toLowerCase().includes(q) &&
          !user.email.toLowerCase().includes(q)
        ) {
          continue;
        }
      }

      results.push({
        userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        organizationCount: orgCountByUser.get(userId) ?? 0,
        isBanned: bannedSet.has(userId),
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const banUser = superAdminMutation({
  args: {
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "banUser", { key: ctx.user._id });

    // Check not banning self
    if (args.userId === ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot ban yourself",
      });
    }

    // Check not already banned
    const existing = await ctx.db
      .query("bannedUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "User is already banned",
      });
    }

    await ctx.db.insert("bannedUsers", {
      userId: args.userId,
      bannedBy: ctx.user._id,
      reason: args.reason,
      bannedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("adminActions", {
      adminUserId: ctx.user._id,
      adminEmail: ctx.user.email,
      action: "ban_user",
      targetType: "user",
      targetId: args.userId,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const unbanUser = superAdminMutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const banned = await ctx.db
      .query("bannedUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!banned) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "User is not banned",
      });
    }

    await ctx.db.delete(banned._id);

    // Log action
    await ctx.db.insert("adminActions", {
      adminUserId: ctx.user._id,
      adminEmail: ctx.user.email,
      action: "unban_user",
      targetType: "user",
      targetId: args.userId,
      createdAt: Date.now(),
    });

    return null;
  },
});

// =============================================================================
// Subscription Management
// =============================================================================

export const updateSubscriptionManually = superAdminMutation({
  args: {
    organizationId: v.id("organization"),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("suspended"),
      v.literal("pending_payment"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (!settings) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization settings not found",
      });
    }

    await ctx.db.patch(settings._id, {
      subscriptionStatus: args.status,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("adminActions", {
      adminUserId: ctx.user._id,
      adminEmail: ctx.user.email,
      action: "update_subscription",
      targetType: "organization",
      targetId: args.organizationId,
      reason: `Changed subscription status to: ${args.status}`,
      createdAt: Date.now(),
    });

    return null;
  },
});

// =============================================================================
// Action Log
// =============================================================================

export const getActionLog = superAdminQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(adminActionLogValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const actions = await ctx.db
      .query("adminActions")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    return actions.map((a) => ({
      _id: a._id,
      _creationTime: a._creationTime,
      adminEmail: a.adminEmail,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      reason: a.reason,
      createdAt: a.createdAt,
    }));
  },
});
