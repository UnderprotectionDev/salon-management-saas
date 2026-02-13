import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import {
  genderValidator,
  hairLengthValidator,
  hairTypeValidator,
  userOnboardingProfileValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/** Get the current user's profile (or null if not created yet) */
export const get = authedQuery({
  args: {},
  returns: v.union(userOnboardingProfileValidator, v.null()),
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!profile) return null;

    return {
      _id: profile._id,
      phone: profile.phone,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      hairType: profile.hairType,
      hairLength: profile.hairLength,
      allergies: profile.allergies,
      allergyNotes: profile.allergyNotes,
      dataProcessingConsent: profile.dataProcessingConsent,
      marketingConsent: profile.marketingConsent,
      emailReminders: profile.emailReminders,
      marketingEmails: profile.marketingEmails,
      onboardingCompleted: profile.onboardingCompleted,
      onboardingDismissedAt: profile.onboardingDismissedAt,
    };
  },
});

/** Check if user has accepted KVKK consent (lightweight check) */
export const hasConsent = authedQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    return profile?.dataProcessingConsent === true;
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
    dateOfBirth: v.optional(v.string()),
    hairType: v.optional(hairTypeValidator),
    hairLength: v.optional(hairLengthValidator),
    allergies: v.optional(v.array(v.string())),
    allergyNotes: v.optional(v.string()),
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

    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.hairType !== undefined) updates.hairType = args.hairType;
    if (args.hairLength !== undefined) updates.hairLength = args.hairLength;
    if (args.allergies !== undefined) updates.allergies = args.allergies;
    if (args.allergyNotes !== undefined)
      updates.allergyNotes = args.allergyNotes;

    await ctx.db.patch(profile._id, updates);
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
