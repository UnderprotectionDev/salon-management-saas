import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Initialization script that runs on first deployment or after clearing data.
 * Automatically syncs products from Polar.
 */
export const initialize = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Initializing: Syncing products from Polar...");

    try {
      await ctx.runAction(internal.polarSync.syncProducts);
      console.log("✅ Products synced successfully");
    } catch (error) {
      console.error("❌ Failed to sync products:", error);
      throw error;
    }
  },
});
