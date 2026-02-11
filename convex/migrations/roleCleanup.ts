import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Convert all "admin" and "member" roles to "staff".
 *
 * Run via Convex dashboard or CLI:
 *   npx convex run migrations/roleCleanup:migrateRoles
 */
export const migrateRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    let memberUpdated = 0;

    // Migrate member table: admin → staff, member → staff
    // Use `as string` because the schema no longer allows these old values
    const allMembers = await ctx.db.query("member").collect();
    for (const member of allMembers) {
      const role = member.role as string;
      if (role === "admin" || role === "member") {
        await ctx.db.patch(member._id, { role: "staff" } as never);
        memberUpdated++;
      }
    }

    // Migrate invitation table: admin/member → staff
    let invitationUpdated = 0;
    const allInvitations = await ctx.db.query("invitation").collect();
    for (const invitation of allInvitations) {
      const role = invitation.role as string;
      if (role === "admin" || role === "member") {
        await ctx.db.patch(invitation._id, { role: "staff" } as never);
        invitationUpdated++;
      }
    }

    return {
      membersUpdated: memberUpdated,
      invitationsUpdated: invitationUpdated,
    };
  },
});
