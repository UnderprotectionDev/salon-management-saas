import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  aiAnalysisResultValidator,
  aiQuickAnswersValidator,
} from "./lib/aiValidators";

// Application schema with organization management
// Organization and member tables are managed here (not in Better Auth component)

export default defineSchema({
  // Organization (salon)
  organization: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    // MIGRATION: accepts both old string format and new array format
    // After running migrations/salonTypeMigration:migrateSalonTypes, revert to array-only
    salonType: v.optional(
      v.union(
        v.array(
          v.union(
            v.literal("hair_women"),
            v.literal("hair_men"),
            v.literal("children"),
            v.literal("braiding"),
            v.literal("blowout_bar"),
            v.literal("hair_extensions"),
            v.literal("nail"),
            v.literal("makeup"),
            v.literal("skincare"),
            v.literal("lash_brow"),
            v.literal("permanent_makeup"),
            v.literal("threading"),
            v.literal("head_spa"),
            v.literal("spa"),
            v.literal("massage"),
            v.literal("hammam"),
            v.literal("sauna"),
            v.literal("ayurveda"),
            v.literal("float_therapy"),
            v.literal("waxing"),
            v.literal("tanning"),
            v.literal("laser"),
            v.literal("electrolysis"),
            v.literal("medspa"),
            v.literal("aesthetic_clinic"),
            v.literal("cryotherapy"),
            v.literal("iv_therapy"),
            v.literal("body_contouring"),
            v.literal("hair_loss"),
            v.literal("tattoo"),
            v.literal("piercing"),
            v.literal("henna"),
            v.literal("pet_grooming"),
            v.literal("beauty_center"),
          ),
        ),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("slug", ["slug"])
    .index("name", ["name"]),

  // Member (organization membership)
  member: defineTable({
    organizationId: v.id("organization"),
    userId: v.string(), // Better Auth user ID (from component)
    role: v.union(v.literal("owner"), v.literal("staff")),
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
    role: v.literal("staff"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("rejected"),
    ),
    invitedBy: v.string(), // User ID who sent the invite
    expiresAt: v.optional(v.number()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
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
        neighbourhood: v.optional(v.string()),
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
    // Social media
    socialMedia: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        tiktok: v.optional(v.string()),
        googleMapsUrl: v.optional(v.string()),
      }),
    ),
    // Subscription / billing
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("trialing"),
        v.literal("past_due"),
        v.literal("canceling"),
        v.literal("canceled"),
        v.literal("unpaid"),
        v.literal("suspended"),
        v.literal("pending_payment"),
      ),
    ),
    subscriptionPlan: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    gracePeriodEndsAt: v.optional(v.number()),
    suspendedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    cancellationComment: v.optional(v.string()),
    // Setup checklist (onboarding progress)
    setupChecklist: v.optional(
      v.object({
        dismissedAt: v.optional(v.number()),
      }),
    ),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("by_polar_subscription", ["polarSubscriptionId"])
    .index("by_subscription_status", ["subscriptionStatus"]),

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
    .index("organizationId_email", ["organizationId", "email"])
    .index("email", ["email"]),

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

  // Schedule Overrides — per-day schedule changes (custom hours, day off, time off)
  scheduleOverrides: defineTable({
    staffId: v.id("staff"),
    organizationId: v.id("organization"),
    date: v.string(), // "YYYY-MM-DD"
    type: v.union(
      v.literal("custom_hours"),
      v.literal("day_off"),
      v.literal("time_off"),
    ),
    startTime: v.optional(v.string()), // "HH:MM" — required for custom_hours
    endTime: v.optional(v.string()),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_staff_date", ["staffId", "date"])
    .index("by_org_date", ["organizationId", "date"]),

  // Time-Off Requests — vacation, sick leave, personal time requests
  timeOffRequests: defineTable({
    staffId: v.id("staff"),
    organizationId: v.id("organization"),
    startDate: v.string(),
    endDate: v.string(),
    type: v.union(
      v.literal("vacation"),
      v.literal("sick"),
      v.literal("personal"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reason: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    approvedBy: v.optional(v.id("staff")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_staff", ["staffId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_staff_dates", ["staffId", "startDate"]),

  // Staff Overtime — extra work hours beyond default schedule
  staffOvertime: defineTable({
    staffId: v.id("staff"),
    organizationId: v.id("organization"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_staff_date", ["staffId", "date"])
    .index("by_org_date", ["organizationId", "date"]),

  // Customers
  customers: defineTable({
    organizationId: v.id("organization"),
    userId: v.optional(v.string()),
    // Contact
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    phoneVerified: v.optional(v.boolean()),
    // Account Status
    accountStatus: v.optional(
      v.union(
        v.literal("guest"),
        v.literal("recognized"),
        v.literal("prompted"),
        v.literal("registered"),
      ),
    ),
    // Preferences
    preferredStaffId: v.optional(v.id("staff")),
    // Stats (denormalized)
    totalVisits: v.optional(v.number()),
    totalSpent: v.optional(v.number()),
    lastVisitDate: v.optional(v.string()),
    noShowCount: v.optional(v.number()),
    // Notes
    customerNotes: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // Source
    source: v.optional(
      v.union(
        v.literal("online"),
        v.literal("walk_in"),
        v.literal("phone"),
        v.literal("staff"),
        v.literal("import"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_email", ["organizationId", "email"])
    .index("by_org_phone", ["organizationId", "phone"])
    .index("by_user", ["userId"])
    .index("by_org_status", ["organizationId", "accountStatus"])
    .searchIndex("search_customers", {
      searchField: "name",
      filterFields: ["organizationId"],
    }),

  // Appointments — booking records
  appointments: defineTable({
    organizationId: v.id("organization"),
    customerId: v.id("customers"),
    staffId: v.union(v.id("staff"), v.null()), // Nullable: set to null when staff is removed
    date: v.string(), // "YYYY-MM-DD"
    startTime: v.number(), // Minutes from midnight (540 = 09:00)
    endTime: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
    source: v.union(
      v.literal("online"),
      v.literal("walk_in"),
      v.literal("phone"),
      v.literal("staff"),
    ),
    confirmationCode: v.string(),
    confirmedAt: v.optional(v.number()),
    checkedInAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    noShowAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(
      v.union(v.literal("customer"), v.literal("staff"), v.literal("system")),
    ),
    cancellationReason: v.optional(v.string()),
    subtotal: v.number(), // kuruş
    discount: v.optional(v.number()),
    total: v.number(), // kuruş
    paymentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("partial"),
        v.literal("refunded"),
      ),
    ),
    paymentMethod: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    customerNotes: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
    notificationReminderSentAt: v.optional(v.number()), // 30-min in-app reminder

    confirmationSentAt: v.optional(v.number()),
    // Reschedule tracking
    rescheduledAt: v.optional(v.number()),
    rescheduleCount: v.optional(v.number()),
    rescheduleHistory: v.optional(
      v.array(
        v.object({
          fromDate: v.string(),
          fromStartTime: v.number(),
          fromEndTime: v.number(),
          toDate: v.string(),
          toStartTime: v.number(),
          toEndTime: v.number(),
          rescheduledBy: v.union(v.literal("customer"), v.literal("staff")),
          rescheduledAt: v.number(),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_date", ["organizationId", "date"])
    .index("by_staff_date", ["staffId", "date"]) // Note: Does not include null staffId
    .index("by_staff_org_date", ["staffId", "organizationId", "date"])
    .index("by_customer", ["customerId"])
    .index("by_customer_status", ["customerId", "status"])
    .index("by_confirmation", ["confirmationCode"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_status_date", ["organizationId", "status", "date"])
    .index("by_status_date", ["status", "date"]),

  // Appointment Services — services included in an appointment (junction table)
  appointmentServices: defineTable({
    appointmentId: v.id("appointments"),
    serviceId: v.id("services"),
    serviceName: v.string(), // Denormalized for history
    duration: v.number(), // minutes
    price: v.number(), // kuruş
    staffId: v.union(v.id("staff"), v.null()), // Nullable: set to null when staff is removed
  })
    .index("by_appointment", ["appointmentId"])
    .index("by_service", ["serviceId"]),

  // Slot Locks — temporary locks to prevent double booking
  slotLocks: defineTable({
    organizationId: v.id("organization"),
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    sessionId: v.string(),
    expiresAt: v.number(), // 2 minute TTL
  })
    .index("by_staff_date", ["staffId", "date"])
    .index("by_org_date", ["organizationId", "date"])
    .index("by_expiry", ["expiresAt"])
    .index("by_session", ["sessionId"]),

  // =========================================================================
  // Products & Inventory (M11)
  // =========================================================================

  // Product Categories — grouping for products (per organization)
  productCategories: defineTable({
    organizationId: v.id("organization"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  // Products — items sold by the salon (no e-commerce, catalog only)
  products: defineTable({
    organizationId: v.id("organization"),
    categoryId: v.optional(v.id("productCategories")),
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    brand: v.optional(v.string()),
    // Pricing (kuruş integers — same as services)
    costPrice: v.number(),
    sellingPrice: v.number(),
    // Supplier info (embedded, no separate table)
    supplierInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
    // Variants
    hasVariants: v.optional(v.boolean()),
    // Inventory
    stockQuantity: v.number(),
    lowStockThreshold: v.optional(v.number()),
    // Status
    status: v.union(v.literal("active"), v.literal("inactive")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    imageUrls: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_category", ["organizationId", "categoryId"])
    .index("by_org_status", ["organizationId", "status"]),

  // Product Variant Options — option definitions (e.g. "Size" with values ["100ml","250ml"])
  productVariantOptions: defineTable({
    organizationId: v.id("organization"),
    productId: v.id("products"),
    name: v.string(), // e.g. "Size", "Color"
    values: v.array(v.string()), // e.g. ["100ml", "250ml", "500ml"]
    sortOrder: v.number(),
  }).index("by_product", ["productId"]),

  // Product Variants — individual variant combinations with own pricing/stock
  productVariants: defineTable({
    organizationId: v.id("organization"),
    productId: v.id("products"),
    optionValues: v.array(
      v.object({
        optionName: v.string(),
        value: v.string(),
      }),
    ),
    sku: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    stockQuantity: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_product", ["productId"])
    .index("by_org", ["organizationId"]),

  // Inventory Transactions — audit log for every stock change
  inventoryTransactions: defineTable({
    organizationId: v.id("organization"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    staffId: v.optional(v.id("staff")),
    type: v.union(
      v.literal("restock"),
      v.literal("adjustment"),
      v.literal("waste"),
    ),
    quantity: v.number(), // signed: positive = add, negative = remove
    previousStock: v.number(),
    newStock: v.number(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_org_date", ["organizationId", "createdAt"]),

  // Price History — audit log for price changes
  priceHistory: defineTable({
    organizationId: v.id("organization"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    field: v.union(v.literal("costPrice"), v.literal("sellingPrice")),
    previousValue: v.number(),
    newValue: v.number(),
    changedBy: v.optional(v.id("staff")),
    createdAt: v.number(),
  })
    .index("by_product", ["productId", "createdAt"])
    .index("by_org_date", ["organizationId", "createdAt"]),

  // Product Benefits — cached from Polar API
  productBenefits: defineTable({
    polarProductId: v.string(),
    benefits: v.array(v.string()),
  }).index("polarProductId", ["polarProductId"]),

  // SuperAdmin action log
  adminActions: defineTable({
    adminUserId: v.string(),
    adminEmail: v.string(),
    action: v.string(),
    targetType: v.union(v.literal("organization"), v.literal("user")),
    targetId: v.string(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_target", ["targetType", "targetId"]),

  // Banned users
  bannedUsers: defineTable({
    userId: v.string(),
    bannedBy: v.string(),
    reason: v.optional(v.string()),
    bannedAt: v.number(),
  }).index("by_user", ["userId"]),

  // User Profile — cross-organization customer profile (onboarding data)
  userProfile: defineTable({
    userId: v.string(), // Better Auth user ID (unique per user)
    // Profile info
    phone: v.optional(v.string()), // +90 5XX XXX XX XX (auto-saved from first booking)
    avatarConfig: v.optional(v.any()), // react-nice-avatar AvatarConfig JSON
    avatarUrl: v.optional(v.string()), // legacy Dicebear URL (kept for schema compat)
    avatarSeed: v.optional(v.string()), // legacy Dicebear seed (kept for schema compat)
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("unspecified")),
    ),
    dateOfBirth: v.optional(v.string()), // ISO date "1990-05-15"
    // Hair info
    hairType: v.optional(
      v.union(
        v.literal("straight"),
        v.literal("wavy"),
        v.literal("curly"),
        v.literal("very_curly"),
      ),
    ),
    hairLength: v.optional(
      v.union(
        v.literal("short"),
        v.literal("medium"),
        v.literal("long"),
        v.literal("very_long"),
      ),
    ),
    // Allergies & sensitivities
    allergies: v.optional(v.array(v.string())), // ["ppd", "ammonia", "latex", ...]
    allergyNotes: v.optional(v.string()),
    // Salon category preferences (contextual profile fields)
    salonPreferences: v.optional(
      v.object({
        selectedCategories: v.array(v.string()),
        hair: v.optional(
          v.object({
            hairType: v.optional(
              v.union(
                v.literal("straight"),
                v.literal("wavy"),
                v.literal("curly"),
                v.literal("very_curly"),
              ),
            ),
            hairLength: v.optional(
              v.union(
                v.literal("short"),
                v.literal("medium"),
                v.literal("long"),
                v.literal("very_long"),
              ),
            ),
            naturalHairColor: v.optional(v.string()),
            currentHairColor: v.optional(v.string()),
            colorTreated: v.optional(v.boolean()),
            scalpSensitivity: v.optional(
              v.union(
                v.literal("none"),
                v.literal("mild"),
                v.literal("moderate"),
                v.literal("severe"),
              ),
            ),
            photos: v.optional(v.array(v.id("_storage"))),
            washFrequency: v.optional(
              v.union(
                v.literal("daily"),
                v.literal("every_other_day"),
                v.literal("twice_week"),
                v.literal("weekly"),
                v.literal("less"),
              ),
            ),
            heatToolUsage: v.optional(
              v.union(
                v.literal("none"),
                v.literal("occasional"),
                v.literal("frequent"),
                v.literal("daily"),
              ),
            ),
            productsUsed: v.optional(v.string()),
            lastChemicalTreatment: v.optional(v.string()),
          }),
        ),
        nails: v.optional(
          v.object({
            nailType: v.optional(
              v.union(
                v.literal("natural"),
                v.literal("gel"),
                v.literal("acrylic"),
                v.literal("none"),
              ),
            ),
            skinTone: v.optional(
              v.union(
                v.literal("fair"),
                v.literal("light"),
                v.literal("medium"),
                v.literal("olive"),
                v.literal("tan"),
                v.literal("dark"),
              ),
            ),
            sensitiveSkin: v.optional(v.boolean()),
          }),
        ),
        skin: v.optional(
          v.object({
            skinType: v.optional(
              v.union(
                v.literal("normal"),
                v.literal("dry"),
                v.literal("oily"),
                v.literal("combination"),
                v.literal("sensitive"),
              ),
            ),
            skinConditions: v.optional(v.array(v.string())),
            lashExtensionsHistory: v.optional(v.boolean()),
            photos: v.optional(v.array(v.id("_storage"))),
            dailyRoutine: v.optional(
              v.union(
                v.literal("none"),
                v.literal("basic"),
                v.literal("moderate"),
                v.literal("extensive"),
              ),
            ),
            sunscreenUsage: v.optional(
              v.union(
                v.literal("never"),
                v.literal("sometimes"),
                v.literal("daily"),
              ),
            ),
            activeIngredients: v.optional(v.array(v.string())),
            lastFacialDate: v.optional(v.string()),
          }),
        ),
        spa: v.optional(
          v.object({
            pregnancy: v.optional(v.boolean()),
            bloodPressureIssues: v.optional(v.boolean()),
            chronicPainAreas: v.optional(v.array(v.string())),
            pressurePreference: v.optional(
              v.union(
                v.literal("light"),
                v.literal("medium"),
                v.literal("firm"),
                v.literal("deep"),
              ),
            ),
            aromatherapyPreference: v.optional(v.array(v.string())),
            focusAreas: v.optional(v.array(v.string())),
          }),
        ),
        body: v.optional(
          v.object({
            skinSensitivityLevel: v.optional(
              v.union(
                v.literal("none"),
                v.literal("mild"),
                v.literal("moderate"),
                v.literal("severe"),
              ),
            ),
            previousLaserTreatments: v.optional(v.boolean()),
            tanningHistory: v.optional(
              v.union(
                v.literal("none"),
                v.literal("occasional"),
                v.literal("regular"),
              ),
            ),
            preferredMethod: v.optional(
              v.union(
                v.literal("waxing"),
                v.literal("laser"),
                v.literal("ipl"),
                v.literal("sugaring"),
                v.literal("threading"),
                v.literal("shaving"),
              ),
            ),
            painTolerance: v.optional(
              v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
            ),
            lastTreatmentDate: v.optional(v.string()),
            treatmentAreas: v.optional(v.array(v.string())),
          }),
        ),
        medical: v.optional(
          v.object({
            currentMedications: v.optional(v.string()),
            previousProcedures: v.optional(v.string()),
            physicianClearance: v.optional(v.boolean()),
          }),
        ),
        art: v.optional(
          v.object({
            previousTattoos: v.optional(v.boolean()),
            keloidTendency: v.optional(v.boolean()),
            metalAllergies: v.optional(v.array(v.string())),
            photos: v.optional(v.array(v.id("_storage"))),
          }),
        ),
        specialty: v.optional(
          v.object({
            petType: v.optional(v.string()),
            petBreed: v.optional(v.string()),
            petSize: v.optional(
              v.union(
                v.literal("small"),
                v.literal("medium"),
                v.literal("large"),
              ),
            ),
            photos: v.optional(v.array(v.id("_storage"))),
          }),
        ),
      }),
    ),
    // KVKK consents
    dataProcessingConsent: v.boolean(),
    dataProcessingConsentAt: v.number(),
    marketingConsent: v.optional(v.boolean()),
    marketingConsentAt: v.optional(v.number()),
    consentWithdrawnAt: v.optional(v.number()),
    // Notification preferences (managed from settings)
    emailReminders: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    // Onboarding state
    onboardingCompleted: v.boolean(),
    onboardingCompletedAt: v.optional(v.number()),
    onboardingDismissedAt: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Notifications — staff notifications for booking events
  notifications: defineTable({
    organizationId: v.id("organization"),
    recipientStaffId: v.id("staff"),
    type: v.union(
      v.literal("new_booking"),
      v.literal("cancellation"),
      v.literal("reminder_30min"),
      v.literal("reschedule"),
      v.literal("no_show"),
      v.literal("status_change"),
      v.literal("low_stock"),
    ),
    title: v.string(),
    message: v.string(),
    appointmentId: v.optional(v.id("appointments")),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org_staff", ["organizationId", "recipientStaffId"])
    .index("by_staff_unread", ["recipientStaffId", "isRead"])
    .index("by_created", ["createdAt"]),

  // =========================================================================
  // Favorite Salons (user-level, cross-organization)
  // =========================================================================

  favoriteSalons: defineTable({
    userId: v.string(),
    organizationId: v.id("organization"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_org", ["userId", "organizationId"]),

  // =========================================================================
  // AI Features (M10)
  // =========================================================================

  // AI Credits — user-level credit pool (global across all salons)
  aiCredits: defineTable({
    organizationId: v.optional(v.id("organization")), // reserved for future use
    userId: v.optional(v.string()), // Better Auth user ID — all new records have this set
    poolType: v.literal("customer"),
    balance: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    // Compound index: eliminates .filter(poolType) anti-pattern
    .index("by_user_pool", ["userId", "poolType"]),

  // AI Credit Transactions — audit log for credit purchases, usage, and refunds
  aiCreditTransactions: defineTable({
    organizationId: v.optional(v.id("organization")),
    creditId: v.id("aiCredits"),
    type: v.union(
      v.literal("purchase"),
      v.literal("usage"),
      v.literal("refund"),
    ),
    amount: v.number(), // positive for purchase/refund, negative for usage
    featureType: v.optional(
      v.union(
        v.literal("photoAnalysis"),
        v.literal("quickQuestion"),
        v.literal("virtualTryOn"),
        v.literal("careSchedule"),
      ),
    ),
    referenceId: v.optional(v.string()), // ID of analysis/simulation/schedule, or Polar orderId for purchases
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_credit", ["creditId"])
    .index("by_org", ["organizationId"])
    .index("by_reference", ["referenceId"]),

  // AI Analyses — photo analysis records (user-scoped, org optional for service matching)
  aiAnalyses: defineTable({
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()), // Better Auth user ID
    imageStorageIds: v.array(v.id("_storage")), // 1-3 photos
    salonType: v.union(
      v.literal("hair_women"),
      v.literal("hair_men"),
      v.literal("children"),
      v.literal("braiding"),
      v.literal("blowout_bar"),
      v.literal("hair_extensions"),
      v.literal("nail"),
      v.literal("makeup"),
      v.literal("skincare"),
      v.literal("lash_brow"),
      v.literal("permanent_makeup"),
      v.literal("threading"),
      v.literal("head_spa"),
      v.literal("spa"),
      v.literal("massage"),
      v.literal("hammam"),
      v.literal("sauna"),
      v.literal("ayurveda"),
      v.literal("float_therapy"),
      v.literal("waxing"),
      v.literal("tanning"),
      v.literal("laser"),
      v.literal("electrolysis"),
      v.literal("medspa"),
      v.literal("aesthetic_clinic"),
      v.literal("cryotherapy"),
      v.literal("iv_therapy"),
      v.literal("body_contouring"),
      v.literal("hair_loss"),
      v.literal("tattoo"),
      v.literal("piercing"),
      v.literal("henna"),
      v.literal("pet_grooming"),
      v.literal("beauty_center"),
      v.literal("multi"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    result: v.optional(aiAnalysisResultValidator), // Structured analysis result (type-specific)
    recommendedServiceIds: v.optional(v.array(v.id("services"))),
    quickAnswers: v.optional(aiQuickAnswersValidator), // Map<questionKey, answer>
    errorMessage: v.optional(v.string()),
    agentThreadId: v.optional(v.string()), // @convex-dev/agent thread ID for conversation history
    creditCost: v.number(), // 5 for single, 8 for multi
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // AI Simulations — virtual try-on records (user-scoped, org optional for catalog)
  aiSimulations: defineTable({
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()), // Better Auth user ID
    imageStorageId: v.id("_storage"), // Source photo
    simulationType: v.union(v.literal("catalog"), v.literal("prompt")),
    designCatalogId: v.optional(v.id("designCatalog")),
    promptText: v.optional(v.string()),
    resultImageStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
    creditCost: v.number(), // 10
    galleryApprovedByOrg: v.optional(v.boolean()),
    publicConsent: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // AI Care Schedules — personalized care calendar (user-scoped)
  aiCareSchedules: defineTable({
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()), // Better Auth user ID
    salonType: v.optional(
      v.union(
        v.literal("hair_women"),
        v.literal("hair_men"),
        v.literal("children"),
        v.literal("braiding"),
        v.literal("blowout_bar"),
        v.literal("hair_extensions"),
        v.literal("nail"),
        v.literal("makeup"),
        v.literal("skincare"),
        v.literal("lash_brow"),
        v.literal("permanent_makeup"),
        v.literal("threading"),
        v.literal("head_spa"),
        v.literal("spa"),
        v.literal("massage"),
        v.literal("hammam"),
        v.literal("sauna"),
        v.literal("ayurveda"),
        v.literal("float_therapy"),
        v.literal("waxing"),
        v.literal("tanning"),
        v.literal("laser"),
        v.literal("electrolysis"),
        v.literal("medspa"),
        v.literal("aesthetic_clinic"),
        v.literal("cryotherapy"),
        v.literal("iv_therapy"),
        v.literal("body_contouring"),
        v.literal("hair_loss"),
        v.literal("tattoo"),
        v.literal("piercing"),
        v.literal("henna"),
        v.literal("pet_grooming"),
        v.literal("beauty_center"),
        v.literal("multi"),
      ),
    ),
    recommendations: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        recommendedDate: v.string(), // "YYYY-MM-DD"
        serviceId: v.optional(v.id("services")),
      }),
    ),
    nextCheckDate: v.optional(v.string()), // "YYYY-MM-DD"
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("expired"),
    ),
    agentThreadId: v.optional(v.string()), // @convex-dev/agent thread ID for conversation history
    creditCost: v.number(), // 2
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    // Compound index for filtering by salonType: eliminates .filter(salonType) anti-pattern
    .index("by_user_status_salonType", ["userId", "status", "salonType"])
    // Compound index for cron: find active schedules with due check dates
    .index("by_status_nextCheck", ["status", "nextCheckDate"]),

  // AI Mood Board — saved looks and styles (user-scoped)
  aiMoodBoard: defineTable({
    organizationId: v.optional(v.id("organization")),
    userId: v.optional(v.string()), // Better Auth user ID
    imageStorageId: v.id("_storage"),
    source: v.union(v.literal("analysis"), v.literal("tryon")),
    analysisId: v.optional(v.id("aiAnalyses")),
    simulationId: v.optional(v.id("aiSimulations")),
    designCatalogId: v.optional(v.id("designCatalog")),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Design Catalog — salon design portfolio for virtual try-on
  designCatalog: defineTable({
    organizationId: v.id("organization"),
    name: v.string(),
    category: v.string(),
    imageStorageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    // Design body area (NOT org salon type) — determines which try-on mode to use
    salonType: v.union(
      v.literal("hair"),
      v.literal("nail"),
      v.literal("makeup"),
      v.literal("multi"),
    ),
    status: v.union(v.literal("active"), v.literal("inactive")),
    sortOrder: v.number(),
    createdByStaffId: v.optional(v.id("staff")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_category", ["organizationId", "category"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_staff", ["organizationId", "createdByStaffId"]),

  // =========================================================================
  // Financial Management (M12) — Freeform Spreadsheets
  // =========================================================================

  // Spreadsheet Sheets — user-created freeform sheets
  spreadsheetSheets: defineTable({
    organizationId: v.id("organization"),
    name: v.string(),
    order: v.number(),
    columnCount: v.optional(v.number()),
    rowCount: v.optional(v.number()),
    freezeRow: v.optional(v.number()),
    freezeCol: v.optional(v.number()),
    mergedRegions: v.optional(
      v.array(
        v.object({
          startRow: v.number(),
          startCol: v.number(),
          endRow: v.number(),
          endCol: v.number(),
        }),
      ),
    ),
    conditionalFormats: v.optional(v.string()), // JSON-serialized CondFormatRule[]
  }).index("by_org", ["organizationId"]),

  // Spreadsheet Cells — cell data for freeform sheets
  spreadsheetCells: defineTable({
    organizationId: v.id("organization"),
    sheetId: v.id("spreadsheetSheets"),
    cellRef: v.string(), // "A1", "B2", etc.
    value: v.string(),
    bold: v.optional(v.boolean()),
    italic: v.optional(v.boolean()),
    underline: v.optional(v.boolean()),
    align: v.optional(
      v.union(v.literal("left"), v.literal("center"), v.literal("right")),
    ),
    fontSize: v.optional(v.string()),
    fontFamily: v.optional(v.string()),
    bgColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
    numberFormat: v.optional(v.string()),
    validationRule: v.optional(v.string()), // JSON-serialized ValidationRule
  })
    .index("by_sheet", ["sheetId"])
    .index("by_org_sheet", ["organizationId", "sheetId"]),

  // Custom Formulas — user-defined formulas per organization
  customFormulas: defineTable({
    organizationId: v.id("organization"),
    name: v.string(), // UPPERCASE, e.g. "MY_FORMULA"
    body: v.string(), // starts with "=", e.g. "=A1*0.18"
    description: v.optional(v.string()),
    createdBy: v.id("user"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_name", ["organizationId", "name"]),
});
