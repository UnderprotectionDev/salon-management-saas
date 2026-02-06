import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Application schema with organization management
// Organization and member tables are managed here (not in Better Auth component)

export default defineSchema({
  // Organization (salon)
  organization: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("slug", ["slug"])
    .index("name", ["name"]),

  // Member (organization membership)
  member: defineTable({
    organizationId: v.id("organization"),
    userId: v.string(), // Better Auth user ID (from component)
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("userId", ["userId"])
    .index("organizationId_userId", ["organizationId", "userId"]),

  // Invitation (pending staff invitations)
  invitation: defineTable({
    organizationId: v.id("organization"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    phone: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("rejected"),
    ),
    invitedBy: v.string(), // User ID who sent the invite
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("email", ["email"])
    .index("organizationId_email", ["organizationId", "email"])
    .index("status", ["status"]),

  // Organization settings - salon-specific configuration
  organizationSettings: defineTable({
    organizationId: v.id("organization"),
    // Contact info
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    // Address
    address: v.optional(
      v.object({
        street: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      }),
    ),
    // Localization
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    locale: v.optional(v.string()),
    // Business hours: { monday: { open: "09:00", close: "18:00", closed: false }, ... }
    businessHours: v.optional(
      v.object({
        monday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
        tuesday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
        wednesday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
        thursday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
        friday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
        saturday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
        sunday: v.optional(
          v.object({
            open: v.string(),
            close: v.string(),
            closed: v.boolean(),
          }),
        ),
      }),
    ),
    // Booking settings
    bookingSettings: v.optional(
      v.object({
        minAdvanceBookingMinutes: v.optional(v.number()),
        maxAdvanceBookingDays: v.optional(v.number()),
        slotDurationMinutes: v.optional(v.number()),
        bufferBetweenBookingsMinutes: v.optional(v.number()),
        allowOnlineBooking: v.optional(v.boolean()),
        requireDeposit: v.optional(v.boolean()),
        depositAmount: v.optional(v.number()),
        cancellationPolicyHours: v.optional(v.number()),
      }),
    ),
    // Subscription info (for future Polar integration)
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("trialing"),
        v.literal("past_due"),
        v.literal("canceled"),
        v.literal("unpaid"),
      ),
    ),
    subscriptionPlan: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("organizationId", ["organizationId"]),

  // Staff profiles - salon-specific employee data
  staff: defineTable({
    // References
    userId: v.string(), // Better Auth user ID
    organizationId: v.id("organization"),
    memberId: v.id("member"),
    // Profile info
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    // Employment
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending"),
    ),
    // Services this staff can perform
    serviceIds: v.optional(v.array(v.id("services"))),
    // Default weekly schedule
    defaultSchedule: v.optional(
      v.object({
        monday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
        tuesday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
        wednesday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
        thursday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
        friday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
        saturday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
        sunday: v.optional(
          v.object({
            start: v.string(),
            end: v.string(),
            available: v.boolean(),
          }),
        ),
      }),
    ),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("userId", ["userId"])
    .index("memberId", ["memberId"])
    .index("organizationId_userId", ["organizationId", "userId"])
    .index("organizationId_status", ["organizationId", "status"])
    .index("organizationId_email", ["organizationId", "email"]),

  // Service Categories
  serviceCategories: defineTable({
    organizationId: v.id("organization"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_organization", ["organizationId"]),

  // Services
  services: defineTable({
    organizationId: v.id("organization"),
    categoryId: v.optional(v.id("serviceCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    duration: v.number(), // minutes
    bufferTime: v.optional(v.number()), // minutes after service
    price: v.number(), // kuruş (15000 = 150.00 TL)
    priceType: v.union(
      v.literal("fixed"),
      v.literal("starting_from"),
      v.literal("variable"),
    ),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
    isPopular: v.boolean(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    showOnline: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_category", ["organizationId", "categoryId"])
    .index("by_org_status", ["organizationId", "status"]),
});
