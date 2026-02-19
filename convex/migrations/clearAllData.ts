import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * Clears ALL data from every table including Better Auth and Rate Limiter components.
 * WARNING: This is irreversible. Use only in development.
 * NOTE: Polar component data (customers, products, subscriptions) must be cleared
 *       manually from the Polar dashboard — no delete API is exposed.
 *
 * Run via CLI:
 *   bunx convex run migrations/clearAllData:clearAll
 */
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, number> = {};

    // ── App tables ──────────────────────────────────────────────────────────
    const tables = [
      "adminActions",
      "aiAnalyses",
      "aiCareSchedules",
      "aiCredits",
      "aiCreditTransactions",
      "aiMoodBoard",
      "aiSimulations",
      "appointmentServices",
      "appointments",
      "bannedUsers",
      "customers",
      "designCatalog",
      "favoriteSalons",
      "inventoryTransactions",
      "invitation",
      "member",
      "notifications",
      "organization",
      "organizationSettings",
      "productBenefits",
      "productCategories",
      "products",
      "scheduleOverrides",
      "serviceCategories",
      "services",
      "slotLocks",
      "staff",
      "staffOvertime",
      "timeOffRequests",
      "userProfile",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      await Promise.all(docs.map((doc) => ctx.db.delete(doc._id)));
      results[table] = docs.length;
    }

    // ── Better Auth component tables ────────────────────────────────────────
    const deleteAuthModel = (model: string) =>
      ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        // biome-ignore lint/suspicious/noExplicitAny: union type across 11 models requires cast
        input: { model } as any,
        paginationOpts: { cursor: null, numItems: 1000 },
      });

    for (const model of [
      "user",
      "session",
      "account",
      "verification",
      "twoFactor",
      "passkey",
      "oauthApplication",
      "oauthAccessToken",
      "oauthConsent",
      "jwks",
      "rateLimit",
    ]) {
      await deleteAuthModel(model);
      results[`betterAuth.${model}`] = -1;
    }

    // ── Rate Limiter component ───────────────────────────────────────────────
    await ctx.runMutation(components.rateLimiter.lib.clearAll, {});
    results["rateLimiter.rateLimits"] = -1;

    return results;
  },
});
