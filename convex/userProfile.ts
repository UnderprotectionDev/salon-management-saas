import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import {
  artPreferencesValidator,
  avatarConfigValidator,
  bodyPreferencesValidator,
  genderValidator,
  hairLengthValidator,
  hairPreferencesValidator,
  hairTypeValidator,
  medicalPreferencesValidator,
  nailsPreferencesValidator,
  skinPreferencesValidator,
  spaPreferencesValidator,
  specialtyPreferencesValidator,
  userOnboardingProfileValidator,
} from "./lib/validators";

// =============================================================================
// Helpers
// =============================================================================

const VALID_CATEGORIES = [
  "hair_styling",
  "nails_makeup",
  "skin_face",
  "spa_wellness",
  "body_treatments",
  "medical_aesthetic",
  "art_expression",
  "specialty",
] as const;

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the current user's profile (or null if not created yet).
 *
 * Read-time migration: if `salonPreferences` is absent but legacy `hairType`/`hairLength`
 * fields exist, a synthesized shape is returned. The returned object may therefore
 * differ from what is stored in the DB.
 */
export const get = authedQuery({
  args: {},
  returns: v.union(userOnboardingProfileValidator, v.null()),
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) return null;

    // Read-time migration: synthesize salonPreferences from legacy fields
    const salonPreferences =
      profile.salonPreferences ??
      (profile.hairType || profile.hairLength
        ? {
            selectedCategories: ["hair_styling"],
            hair: {
              hairType: profile.hairType,
              hairLength: profile.hairLength,
            },
          }
        : undefined);

    return {
      _id: profile._id,
      phone: profile.phone,
      avatarConfig: profile.avatarConfig,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      hairType: profile.hairType,
      hairLength: profile.hairLength,
      allergies: profile.allergies,
      allergyNotes: profile.allergyNotes,
      salonPreferences,
      dataProcessingConsent: profile.dataProcessingConsent,
      marketingConsent: profile.marketingConsent,
      emailReminders: profile.emailReminders,
      marketingEmails: profile.marketingEmails,
      onboardingCompleted: profile.onboardingCompleted,
      onboardingDismissedAt: profile.onboardingDismissedAt,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/** Accept KVKK consent — creates profile if not exists */
export const acceptConsent = authedMutation({
  args: {
    marketingConsent: v.optional(v.boolean()),
  },
  returns: v.id("userProfile"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dataProcessingConsent: true,
        dataProcessingConsentAt: now,
        marketingConsent: args.marketingConsent ?? false,
        marketingConsentAt: args.marketingConsent ? now : undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userProfile", {
      userId: ctx.user._id,
      dataProcessingConsent: true,
      dataProcessingConsentAt: now,
      marketingConsent: args.marketingConsent ?? false,
      marketingConsentAt: args.marketingConsent ? now : undefined,
      onboardingCompleted: false,
      emailReminders: true,
      marketingEmails: args.marketingConsent ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update onboarding profile fields (wizard steps) */
export const updateProfile = authedMutation({
  args: {
    gender: v.optional(genderValidator),
    avatarConfig: v.optional(avatarConfigValidator),
    dateOfBirth: v.optional(v.string()),
    hairType: v.optional(hairTypeValidator),
    hairLength: v.optional(hairLengthValidator),
    allergies: v.optional(v.array(v.string())),
    allergyNotes: v.optional(v.string()),
    phone: v.optional(v.string()),
    emailReminders: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    marketingConsent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message:
          "Profile not found. Please accept the data processing consent first.",
      });
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.gender !== undefined) {
      updates.gender = args.gender;
    }
    if (args.avatarConfig !== undefined) {
      updates.avatarConfig = args.avatarConfig;
    }
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.hairType !== undefined) updates.hairType = args.hairType;
    if (args.hairLength !== undefined) updates.hairLength = args.hairLength;
    if (args.allergies !== undefined) updates.allergies = args.allergies;
    if (args.allergyNotes !== undefined)
      updates.allergyNotes = args.allergyNotes;

    if (args.phone !== undefined) {
      if (args.phone !== "" && !isValidTurkishPhone(args.phone)) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid phone number format. Expected: +90 5XX XXX XX XX",
        });
      }
      updates.phone = args.phone || undefined;
    }

    if (args.emailReminders !== undefined)
      updates.emailReminders = args.emailReminders;
    if (args.marketingEmails !== undefined)
      updates.marketingEmails = args.marketingEmails;

    if (args.marketingConsent !== undefined) {
      updates.marketingConsent = args.marketingConsent;
      if (args.marketingConsent) {
        updates.marketingConsentAt = Date.now();
        updates.consentWithdrawnAt = undefined;
      } else {
        updates.marketingConsentAt = undefined;
        updates.consentWithdrawnAt = Date.now();
      }
    }

    await ctx.db.patch(profile._id, updates);
    return null;
  },
});

/** Update selected salon categories */
export const updateSelectedCategories = authedMutation({
  args: {
    selectedCategories: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "updateUserProfile", {
      key: ctx.user._id,
      throws: true,
    });

    // Validate categories against whitelist
    const invalid = args.selectedCategories.filter(
      (c) => !(VALID_CATEGORIES as readonly string[]).includes(c),
    );
    if (invalid.length > 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Invalid categories: ${invalid.join(", ")}`,
      });
    }
    if (args.selectedCategories.length > VALID_CATEGORIES.length) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Too many categories",
      });
    }

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Profile not found",
      });
    }

    const existing = profile.salonPreferences ?? { selectedCategories: [] };
    await ctx.db.patch(profile._id, {
      salonPreferences: {
        ...existing,
        selectedCategories: args.selectedCategories,
      },
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Update preferences for a specific salon category */
export const updateCategoryPreferences = authedMutation({
  args: {
    category: v.union(
      v.literal("hair"),
      v.literal("nails"),
      v.literal("skin"),
      v.literal("spa"),
      v.literal("body"),
      v.literal("medical"),
      v.literal("art"),
      v.literal("specialty"),
    ),
    data: v.union(
      hairPreferencesValidator,
      nailsPreferencesValidator,
      skinPreferencesValidator,
      spaPreferencesValidator,
      bodyPreferencesValidator,
      medicalPreferencesValidator,
      artPreferencesValidator,
      specialtyPreferencesValidator,
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "updateUserProfile", {
      key: ctx.user._id,
      throws: true,
    });

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Profile not found",
      });
    }

    // Validate photo ownership
    const dataAny = args.data as { photos?: string[] };
    if (dataAny.photos && dataAny.photos.length > 0) {
      const urls = await Promise.all(
        dataAny.photos.map((id) => ctx.storage.getUrl(id as string)),
      );
      const invalid = urls.some((url) => url === null);
      if (invalid) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid photo reference",
        });
      }
    }

    // Validate photo count (applies to all categories with photos)
    if (dataAny.photos && dataAny.photos.length > 3) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Maximum 3 photos per category",
      });
    }

    // Validate text field lengths
    if (args.category === "hair") {
      const d = args.data as { productsUsed?: string };
      if (d.productsUsed && d.productsUsed.length > 500) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Products used too long (max 500 chars)",
        });
      }
    }
    if (args.category === "medical") {
      const d = args.data as {
        currentMedications?: string;
        previousProcedures?: string;
      };
      if (d.currentMedications && d.currentMedications.length > 1000) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Current medications too long (max 1000 chars)",
        });
      }
      if (d.previousProcedures && d.previousProcedures.length > 1000) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Previous procedures too long (max 1000 chars)",
        });
      }
    }
    if (args.category === "specialty") {
      const d = args.data as { petType?: string; petBreed?: string };
      if (d.petType && d.petType.length > 100) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Pet type too long (max 100 chars)",
        });
      }
      if (d.petBreed && d.petBreed.length > 100) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Pet breed too long (max 100 chars)",
        });
      }
    }

    const existing = profile.salonPreferences ?? { selectedCategories: [] };
    const updated = {
      ...existing,
      [args.category]: args.data,
    };

    const patchData: Record<string, unknown> = {
      salonPreferences: updated,
      updatedAt: Date.now(),
    };

    // Dual-write: sync hair preferences to legacy flat fields
    if (args.category === "hair") {
      const hairData = args.data as {
        hairType?: string;
        hairLength?: string;
      };
      if (hairData.hairType !== undefined)
        patchData.hairType = hairData.hairType;
      if (hairData.hairLength !== undefined)
        patchData.hairLength = hairData.hairLength;
    }

    await ctx.db.patch(profile._id, patchData);
    return null;
  },
});

/** Mark onboarding as completed (including skip) */
export const completeOnboarding = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Profile not found",
      });
    }

    await ctx.db.patch(profile._id, {
      onboardingCompleted: true,
      onboardingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Dismiss the onboarding banner */
export const dismissOnboarding = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Profile not found",
      });
    }

    await ctx.db.patch(profile._id, {
      onboardingDismissedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Save phone from booking to user profile (called after first booking) */
export const savePhoneFromBooking = authedMutation({
  args: {
    phone: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    // Only save if profile exists and phone is not already set
    if (profile && !profile.phone) {
      if (!isValidTurkishPhone(args.phone)) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid phone number format. Expected: +90 5XX XXX XX XX",
        });
      }
      await ctx.db.patch(profile._id, {
        phone: args.phone,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/** Update notification preferences (from settings page) */
export const updateNotificationPreferences = authedMutation({
  args: {
    emailReminders: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    marketingConsent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Profile not found",
      });
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.emailReminders !== undefined)
      updates.emailReminders = args.emailReminders;
    if (args.marketingEmails !== undefined)
      updates.marketingEmails = args.marketingEmails;
    if (args.marketingConsent !== undefined) {
      updates.marketingConsent = args.marketingConsent;
      updates.marketingConsentAt = args.marketingConsent
        ? Date.now()
        : undefined;
      if (!args.marketingConsent) {
        updates.consentWithdrawnAt = Date.now();
      }
    }

    await ctx.db.patch(profile._id, updates);
    return null;
  },
});
