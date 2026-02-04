# Glossary

> **Last Updated:** 2026-02-04

This document defines domain-specific terminology used throughout the Salon Management SaaS documentation.

---

## Business Terms

### Appointment

A scheduled time slot where a customer receives one or more services from a staff member. Also referred to as "booking" or "randevu" (Turkish).

**States:** pending, confirmed, checked_in, in_progress, completed, cancelled, no_show

### Booking

See [Appointment](#appointment). Used interchangeably, though "booking" often refers to the act of creating an appointment, while "appointment" refers to the scheduled event itself.

### Check-in

The process of marking a customer as arrived at the salon for their appointment. Triggers notification to the assigned staff member.

### Checkout

The process of completing an appointment, recording services rendered, products sold, and payment received.

### Customer

An individual who books and receives services at a salon. May or may not have a registered account. Also referred to as "müşteri" (Turkish).

### No-Show

When a customer fails to appear for their scheduled appointment without cancelling. Typically marked after 15 minutes past appointment time.

### Organization

A single salon business entity in the multi-tenant system. Each organization has its own staff, services, customers, and appointments. Also referred to as "tenant" or "salon".

### Service

A specific offering that a salon provides (e.g., haircut, coloring, manicure). Has associated duration, price, and eligible staff.

**Attributes:**
- Name
- Description
- Duration (in minutes)
- Price (in TRY)
- Category

### Service Category

A grouping of related services (e.g., "Hair", "Nails", "Makeup"). Used for organizing the service catalog.

### Staff

An employee or team member of a salon. Can have different roles (owner, admin, staff) with varying permissions.

### Walk-in

A customer who arrives at the salon without a prior appointment and requests immediate service.

---

## Subscription & Billing Terms

### MRR (Monthly Recurring Revenue)

The total predictable revenue generated from active subscriptions in a given month. Calculated as the sum of all monthly subscription fees (yearly subscriptions divided by 12).

**Example:**
- 10 monthly subscriptions × ₺500 = ₺5,000
- 5 yearly subscriptions × (₺5,100/12) = ₺2,125
- **Total MRR: ₺7,125**

### ARR (Annual Recurring Revenue)

The annualized value of recurring revenue. Calculated as MRR × 12.

### Churn Rate

The percentage of subscribers who cancel their subscription within a given period. Lower is better.

**Formula:** `(Cancelled subscriptions in period / Total subscriptions at start) × 100`

**Target:** <5% monthly churn

### Grace Period

A 7-day window after a payment failure during which the organization retains full access while attempting to resolve the payment issue. Reminder emails are sent on days 1, 3, 5, and 7.

### Subscription Status

The current state of an organization's subscription:

| Status | Description | Access Level |
|--------|-------------|--------------|
| `trial` | New organization, not yet subscribed | Limited/Demo |
| `active` | Payment successful, subscription current | Full |
| `past_due` | Payment failed, in grace period | Full (with warnings) |
| `suspended` | Grace period expired | Billing page only |
| `cancelled` | User cancelled, access until period end | Full until end date |

### ARPU (Average Revenue Per User)

Average monthly revenue generated per subscribing organization. For a single-tier product, this equals the monthly price (₺500 for monthly, ₺425 for yearly).

---

## Technical Terms

### Action (Convex)

A Convex function that can perform side effects like calling external APIs. Unlike mutations, actions can be async and don't run in transactions.

### Better Auth

An authentication framework used for handling user login, session management, and identity verification. Integrates with Convex via adapter.

### Convex

The backend platform used for database, server functions, and real-time subscriptions. Provides a unified solution for data storage and API.

### Magic Link

A passwordless authentication method where users receive a unique, time-limited link via email to log in.

### Multi-tenancy

An architecture where a single application instance serves multiple organizations (tenants) while keeping their data isolated.

### Mutation (Convex)

A Convex function that modifies database state. Runs in a transaction ensuring ACID properties.

### OTP (One-Time Password)

A temporary code (usually 6 digits) sent via SMS or email to verify user identity. Used for booking verification.

### Query (Convex)

A Convex function that reads data from the database. Can be subscribed to for real-time updates.

### Slot

A time period available for booking. Typically in 15-minute increments.

### Slot Lock

A temporary reservation of a time slot during the booking process. Prevents double-booking when multiple users attempt to book simultaneously. Has a TTL (time-to-live) of 2 minutes.

### Subscription (Convex)

A real-time connection that automatically updates the client when underlying data changes.

### Tenant

See [Organization](#organization).

---

## Abbreviations

| Abbreviation | Full Form | Description |
|--------------|-----------|-------------|
| API | Application Programming Interface | Communication interface between systems |
| ARR | Annual Recurring Revenue | Yearly subscription revenue |
| ARPU | Average Revenue Per User | Revenue per subscriber |
| CTA | Call to Action | Button or link prompting user action |
| CRUD | Create, Read, Update, Delete | Basic data operations |
| CSS | Cascading Style Sheets | Styling language for web |
| DB | Database | Data storage system |
| DX | Developer Experience | Quality of development workflow |
| E2E | End-to-End | Testing from user perspective |
| GDPR | General Data Protection Regulation | EU data privacy law |
| i18n | Internationalization | Multi-language support |
| ID | Identifier | Unique reference to an entity |
| JWT | JSON Web Token | Secure token format |
| KPI | Key Performance Indicator | Success measurement metric |
| KVKK | Kişisel Verilerin Korunması Kanunu | Turkish data protection law (similar to GDPR) |
| MRR | Monthly Recurring Revenue | Monthly subscription revenue |
| MVP | Minimum Viable Product | First functional product version |
| OTP | One-Time Password | Temporary verification code |
| P0/P1/P2/P3 | Priority levels | Feature priority classification |
| PCI DSS | Payment Card Industry Data Security Standard | Card payment security requirements |
| PRD | Product Requirements Document | Feature specifications |
| PWA | Progressive Web App | Web app with native-like features |
| RBAC | Role-Based Access Control | Permission system based on user roles |
| RSC | React Server Components | Server-side React rendering |
| SaaS | Software as a Service | Cloud-based software delivery |
| SDK | Software Development Kit | Developer tools package |
| SEO | Search Engine Optimization | Improving search visibility |
| SMS | Short Message Service | Text messaging |
| SSR | Server-Side Rendering | Rendering on the server |
| TRY | Turkish Lira | Currency code |
| TTL | Time To Live | Expiration duration |
| UI | User Interface | Visual elements users interact with |
| URL | Uniform Resource Locator | Web address |
| UX | User Experience | Overall user satisfaction |
| WCAG | Web Content Accessibility Guidelines | Accessibility standards |

---

## Turkish Terms

| Turkish | English | Context |
|---------|---------|---------|
| Kuaför | Hair Salon | Business type |
| Randevu | Appointment | Core feature |
| Müşteri | Customer | User type |
| Personel | Staff | User type |
| Hizmet | Service | Offering |
| İptal | Cancel | Action |
| Onay | Confirmation | Status |
| Ödeme | Payment | Transaction |
| Fiyat | Price | Pricing |
| Saat | Hour/Time | Scheduling |
| Gün | Day | Scheduling |
| Hafta | Week | Scheduling |
| Ay | Month | Scheduling |

---

## Status Definitions

### Appointment Statuses

| Status | Description | Next Possible States |
|--------|-------------|---------------------|
| `pending` | Awaiting confirmation | confirmed, cancelled |
| `confirmed` | Booking confirmed | checked_in, cancelled, no_show |
| `checked_in` | Customer has arrived | in_progress, no_show |
| `in_progress` | Service being performed | completed |
| `completed` | Service finished | (terminal) |
| `cancelled` | Appointment cancelled | (terminal) |
| `no_show` | Customer didn't appear | (terminal) |

### Staff Statuses

| Status | Description |
|--------|-------------|
| `active` | Can log in and take appointments |
| `inactive` | Account disabled, cannot log in |
| `pending` | Invited but hasn't accepted yet |

### Service Statuses

| Status | Description |
|--------|-------------|
| `active` | Available for booking |
| `inactive` | Hidden from booking, preserved in history |

### Organization Statuses

| Status | Description |
|--------|-------------|
| `active` | Fully operational |
| `trial` | In trial period |
| `suspended` | Temporarily disabled |

---

## Time Conventions

### Time Formats

| Format | Example | Usage |
|--------|---------|-------|
| ISO Date | `2024-03-15` | Database storage, API |
| Display Date | `15.03.2024` | Turkish UI display |
| Display Time | `14:30` | 24-hour format |
| Minutes from midnight | `870` | Internal time storage (14:30 = 14*60 + 30) |
| Unix timestamp | `1710505800000` | Absolute timestamps |

### Duration Conventions

- Service durations stored in minutes
- Slot increments: 15 minutes
- Buffer times: optional, added after service

### Timezone

- Default: `Europe/Istanbul`
- Stored as string, not offset (handles DST)
- All times displayed in salon's timezone
