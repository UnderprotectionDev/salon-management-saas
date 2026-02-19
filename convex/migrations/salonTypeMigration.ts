import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Convert organization.salonType from string to string[].
 *
 * Old format: salonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi"
 * New format: salonType = Array<"hair" | "nail" | "makeup" | "barber" | "spa">
 *
 * Run via CLI:
 *   bun x convex run migrations/salonTypeMigration:migrateSalonTypes
 *
 * After running, update convex/schema.ts to remove the old string literals
 * from the salonType union (keep only v.array(...)).
 */
export const migrateSalonTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    let skipped = 0;

    const allOrgs = await ctx.db.query("organization").collect();

    for (const org of allOrgs) {
      const salonType = org.salonType as string | string[] | undefined | null;

      // Already migrated (array format)
      if (Array.isArray(salonType)) {
        skipped++;
        continue;
      }

      // No salonType set — skip
      if (!salonType) {
        skipped++;
        continue;
      }

      // Convert old string → array
      let newTypes: string[];
      if (salonType === "multi") {
        // "multi" meant offering multiple service types — default to hair + nail + makeup
        newTypes = ["hair", "nail", "makeup"];
      } else {
        newTypes = [salonType];
      }

      await ctx.db.patch(org._id, {
        salonType: newTypes as never,
        updatedAt: Date.now(),
      });

      console.log(
        `Migrated org ${org._id}: "${salonType}" → [${newTypes.join(", ")}]`,
      );
      updated++;
    }

    console.log(
      `Migration complete: ${updated} updated, ${skipped} skipped (total ${allOrgs.length})`,
    );
    return { updated, skipped, total: allOrgs.length };
  },
});
