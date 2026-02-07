# Future Enhancements (Post-MVP)

> **Last Updated:** 2026-02-07
> **Status:** Deferred

This document contains features that are **not guaranteed** to be implemented. These are ideas for potential future versions if the MVP is successful and there is demand.

> **⚠️ Important:** Nothing in this document should be considered a commitment or roadmap. These are possibilities only.

---

## Table of Contents

- [Customer Payment Processing](#customer-payment-processing)
- [Multi-Location Support](#multi-location-support)
- [Recurring Appointments](#recurring-appointments)
- [Waitlist Management](#waitlist-management)
- [Customer Loyalty & Reviews](#customer-loyalty--reviews)
- [Mobile Applications](#mobile-applications)
- [AI-Powered Features](#ai-powered-features)
- [Advanced Analytics & BI](#advanced-analytics--bi)
- [Messaging Integrations](#messaging-integrations)
- [Other Potential Features](#other-potential-features)

---

## Customer Payment Processing

**Priority:** High (if customer demand exists)

**Description:** Enable salons to collect payments from customers for appointments.

### Features

- One-time appointment payments via @polar-sh/sdk
- Deposit collection (% of service price)
- Full prepayment option
- Refund processing
- Receipt/invoice generation for customers
- Financial reporting for salon owners

### Why Deferred

- Adds significant complexity (PCI compliance, payment flows)
- Many salons prefer cash/in-person payment
- Requires payment gateway integration and legal considerations
- Not essential for core MVP value proposition

### Prerequisites

- PCI compliance review
- Payment gateway contract (Polar or alternative)
- Legal consultation for Turkish payment regulations

---

## Multi-Location Support

**Priority:** Medium (niche use case for MVP stage)

**Description:** Allow a single organization to manage multiple physical locations.

### Features

- Single organization with multiple physical locations
- Staff assigned to specific location(s)
- Services per location (optional)
- Location-specific business hours
- Customer chooses location when booking
- Consolidated reporting across locations
- Location comparison analytics

### Why Deferred

- MVP targets single-location salons (majority of market)
- Adds significant complexity to data model and UI
- Each location could use separate organization for MVP
- Multi-location chains are small % of target market

### Prerequisites

- Proven single-location product-market fit
- Customer demand from multi-location chains
- Redesigned data architecture

---

## Recurring Appointments

**Priority:** Medium

**Description:** Allow customers to book recurring appointments automatically.

### Features

- Set recurrence: weekly, bi-weekly, monthly
- Choose end date or number of occurrences
- Manage series (edit single vs all)
- Conflict detection for future dates
- Bulk cancellation of series

### Why Deferred

- Not essential for MVP booking flow
- Adds complexity to scheduling logic
- Can be manually handled by rebooking
- Limited customer demand in early stages

---

## Waitlist Management

**Priority:** Low

**Description:** Allow customers to request notification when slots become available.

### Features

- Customer can request specific date/time/staff
- Notification when slot becomes available
- First-come-first-served or priority-based
- Auto-expire waitlist entries after 24h
- Admin can manually offer slots to waitlist

### Why Deferred

- Not critical for MVP operations
- Adds complexity to notification system
- Can be handled manually by calling customers

---

## Customer Loyalty & Reviews

**Priority:** Medium

**Description:** Reward repeat customers and collect feedback.

### Customer Loyalty Program

- Points-based system to encourage repeat visits
- Earn points per visit (configurable rate)
- Redeem points for discounts
- Tier levels (Bronze, Silver, Gold)
- Points expiration policy

### Customer Reviews & Ratings

- Customers can rate appointments (1-5 stars)
- Optional written review
- Salon owner can respond
- Display average rating on public page
- Review moderation

### Why Deferred

- Not essential for core booking functionality
- Requires careful design to avoid abuse
- Can alienate salons with negative reviews
- Better to launch with strong operational features first

---

## Mobile Applications

**Priority:** Low (web-first approach proven first)

**Description:** Native mobile apps for iOS and Android.

### Features

- React Native for code sharing with web
- Push notifications
- Offline appointment viewing
- Biometric login
- Camera for profile photos

### Why Deferred

- Responsive web app sufficient for MVP
- App store approval process delays
- Ongoing maintenance for multiple platforms
- Distribution and update complexity

### Prerequisites

- Strong web product-market fit
- Significant mobile-only user demand
- Resources for native development

---

## AI-Powered Features

**Priority:** Low (experimental, unproven value)

**Description:** Machine learning features to optimize operations.

### Potential Features

- **Smart Scheduling:** Suggest optimal times based on staff efficiency
- **No-Show Prediction:** Flag high-risk bookings, require deposit
- **Service Recommendations:** Suggest add-on services to customers
- **Demand Forecasting:** Predict busy periods for staffing
- **Dynamic Pricing:** Adjust prices based on demand (controversial)

### Why Deferred

- Unproven value for salon industry
- Requires significant data to train models
- May feel impersonal to customers
- Complex to implement correctly

---

## Advanced Analytics & BI

**Priority:** Low

**Description:** Tableau-like business intelligence dashboards.

### Features

- Advanced BI dashboards with drill-down
- Predictive analytics (AI-powered forecasting)
- Custom report builder
- Scheduled report delivery
- Multi-location comparison

### Why Deferred

- MVP reports cover 80% of salon owner needs
- Adds significant development time
- Most users won't use advanced features
- Better to perfect core analytics first

---

## Messaging Integrations

**Priority:** Low-Medium

**Description:** Notifications via WhatsApp and other channels.

### WhatsApp Integration

- WhatsApp Business API integration
- Template messages (pre-approved)
- Interactive booking confirmations
- Quick reply buttons for confirm/cancel
- Higher open rates than email

### Why Deferred

- Email notifications sufficient for MVP
- WhatsApp Business API requires approval process
- Additional cost per message
- Not all customers prefer WhatsApp

---

## Other Potential Features

These ideas have been mentioned but are lower priority or unvalidated:

### API & Integrations

- Public API for third-party integrations
- Zapier integration
- Webhook system for events
- OAuth provider for third-party apps

### Product & Inventory

- Online product sales / e-commerce
- Shopping cart
- Shipping or in-store pickup
- Order management
- Purchase order management
- Barcode scanning
- Automatic reorder

### Booking & Operations

- Group bookings
- Package deals / service bundles
- Buffer time configuration (currently hardcoded)
- Different staff per service in multi-service bookings
- Appointment notes and custom fields

### Customer Features

- Family accounts (multiple profiles per email)
- Gift cards
- Referral program
- Customer app portal

### Staff & Operations

- Staff commissions tracking
- Time clock / attendance
- Staff performance gamification

### Marketing & Growth

- Public salon directory / marketplace
- Search by location, service, rating
- Featured salon listings (paid)
- Booking directly from marketplace
- Email marketing campaigns
- Promotional codes / coupons

---

## How Features Get Promoted to Roadmap

For a feature to move from this document to the active roadmap:

1. **Customer Demand:** Multiple paying customers request it
2. **Business Impact:** Clear ROI or competitive necessity
3. **Technical Feasibility:** Can be implemented without major rewrites
4. **Resource Availability:** Team has capacity
5. **Strategic Fit:** Aligns with product vision

---

## Notes

- This document is **not a commitment** to build any of these features
- Features may be added, removed, or modified at any time
- Some ideas may never be implemented
- Focus remains on MVP success and customer feedback
- v2.0, v2.x version numbers are illustrative only, not actual release plans

---

**Related Documentation:**
- [Product Overview](./product-overview.md) - MVP features and scope
- [Milestones](../milestones/README.md) - Active development roadmap
- [Features](./features.md) - Current feature specifications
