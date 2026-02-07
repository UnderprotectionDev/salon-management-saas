# Product Overview

> **Last Updated:** 2026-02-06

This document defines the product vision, target market, user personas, business model, and success metrics for the multi-tenant salon management platform.

---

## Table of Contents

- [Vision & Problem Statement](#vision--problem-statement)
- [Target Market](#target-market)
- [User Personas](#user-personas)
- [Business Model & Pricing](#business-model--pricing)
- [Success Metrics](#success-metrics)
- [Go-to-Market Strategy](#go-to-market-strategy)
- [Product Principles](#product-principles)
- [Key Product Decisions](#key-product-decisions)
- [Risks & Mitigations](#risks--mitigations)
- [User Stories](#user-stories)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Future Roadmap](#future-roadmap)

---

## Vision & Problem Statement

### Vision Statement

To become the leading salon management platform in Turkey by providing an intuitive, all-in-one solution that empowers beauty professionals to focus on their craft while the system handles scheduling, customer relationships, and business operations.

### Problem Statement

Turkish beauty salons face several operational challenges:

1. **Manual Scheduling:** Most salons rely on paper calendars or basic spreadsheets, leading to double-bookings and inefficient time management.

2. **No-Shows:** Without automated reminders, no-show rates can reach 15-20%, causing significant revenue loss.

3. **Customer Communication:** Phone-based booking is time-consuming and limits availability to business hours.

4. **Limited Insights:** Salon owners lack visibility into business performance, staff productivity, and customer trends.

5. **Fragmented Tools:** Using separate systems for booking, payments, and customer management creates data silos and operational friction.

---

## Target Market

### Primary Market

- **Small to Medium Beauty Salons** (1-10 staff)
- **Location:** Turkey (initially Istanbul, Ankara, Izmir)
- **Services:** Hair salons, nail studios, barber shops, beauty centers
- **Tech Readiness:** Basic smartphone/computer literacy

### Market Size (Turkey)

- ~150,000 registered beauty salons
- Growing demand for digital booking solutions
- Increasing smartphone penetration among all demographics

---

## User Personas

### Persona 1: Salon Owner - Ahmet (Owner)

| Attribute | Details |
|-----------|---------|
| **Role** | Business Owner / Manager |
| **Age** | 35-55 |
| **Tech Comfort** | Moderate |
| **Primary Goals** | Increase revenue, reduce operational burden, understand business performance |
| **Pain Points** | Lack of visibility into bookings, difficulty managing staff schedules, no-show revenue loss |
| **Key Tasks** | View dashboard, manage staff, configure services, analyze reports |

**Quote:** *"I want to see how my business is doing at a glance and trust that the system handles the details."*

### Persona 2: Admin Staff - Ayse (Admin Role)

| Attribute | Details |
|-----------|---------|
| **Role** | Salon Manager / Admin Staff |
| **Age** | 22-35 |
| **Tech Comfort** | High |
| **Primary Goals** | Process bookings quickly, manage all staff schedules, handle walk-ins efficiently |
| **Pain Points** | Phone interruptions, coordinating multiple staff, handling schedule conflicts |
| **Key Tasks** | Book appointments for any staff, check-in customers, manage schedule, approve time-off requests |

**Quote:** *"I need to handle walk-ins and phone calls while keeping everyone's schedule organized - I can't afford mistakes."*

> **Note:** The system has 3 membership roles (stored in the `member` table): **Owner** (full access including billing), **Admin** (manages bookings, staff, & settings), **Member** (views own schedule, basic access). Authentication is via Google OAuth. There is no separate "Receptionist" role - front desk duties are handled by Admin or Owner.

### Persona 3: Customer - Mehmet (End User)

| Attribute | Details |
|-----------|---------|
| **Role** | Salon Customer |
| **Age** | 25-45 |
| **Tech Comfort** | High (smartphone native) |
| **Primary Goals** | Book appointments easily, find available slots, manage own bookings |
| **Pain Points** | Calling during work hours, forgetting appointments, unclear service options |
| **Key Tasks** | Browse services, select staff, book online, receive reminders, cancel/reschedule |

**Quote:** *"I want to book my haircut at midnight when I remember it, not wait until the salon opens."*

---

## Business Model & Pricing

### Revenue Model

| Aspect | Details |
|--------|---------|
| **Model** | B2B SaaS Subscription |
| **Billing** | Monthly or Yearly recurring |
| **Target** | Per-salon pricing |

### MVP Pricing

| Plan | Billing Period | Price | Savings |
|------|----------------|-------|---------|
| **Standard** | Monthly | ₺500/month | - |
| **Standard** | Yearly | ₺5,100/year | 15% (₺900 savings) |

- Single tier pricing for simplicity
- No feature gating - all customers get full access
- No free trial - premium positioning
- Yearly billing incentivized with 15% discount

### Platform Subscription Billing (MVP)

| Aspect | Details |
|--------|---------|
| **Platform** | Polar.sh |
| **Packages** | @convex-dev/polar (subscriptions), @polar-sh/sdk (API) |
| **Method** | Automatic card billing |
| **Cycle** | Monthly or Yearly |
| **Invoicing** | Automated |
| **Environment** | Sandbox (dev) + Production |

### Subscription Lifecycle

| Phase | Details |
|-------|---------|
| **Active** | Full platform access |
| **Past Due** | Payment failed, 7-day grace period starts |
| **Grace Period** | 7 days with reminder emails (day 1, 3, 5, 7) |
| **Suspended** | After grace period, account locked (billing page only) |
| **Cancelled** | Access until end of billing period, data retained 30 days |

### Subscription Policy

| Policy | Rule |
|--------|------|
| **Grace Period** | 7 days after payment failure |
| **Suspended Access** | Completely locked (only billing/payment page accessible) |
| **Data Retention** | 30 days after subscription ends |
| **Reactivation** | Immediate upon successful payment |

> **Note:** This is for platform subscription billing only. Customer payment processing (salon's customers paying for appointments) is planned for v2.0.

---

## Success Metrics

### MVP Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active Salons | 10+ | Salons with >10 bookings/month |
| Monthly Bookings | 1,000+ | Total appointments across platform |
| User Satisfaction | >4.0/5 | In-app feedback rating |
| System Uptime | 99.9% | Convex infrastructure monitoring |
| No-Show Rate | <10% | Reduction from typical 15-20% |

### Growth Metrics (Post-MVP)

| Metric | Target | Timeline |
|--------|--------|----------|
| Monthly Active Users | 5,000+ | 6 months post-launch |
| Salon Retention | >80% | Monthly retention rate |
| Booking Conversion | >60% | Started bookings → Completed |
| Customer Return Rate | >40% | Customers with 2+ bookings |

### Technical Metrics

| Metric | Target |
|--------|--------|
| Page Load Time | <2s (P95) |
| API Response Time | <200ms (P95) |
| Error Rate | <0.1% |
| Real-time Sync Latency | <100ms |

### Subscription & Revenue Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| MRR | - | Monthly Recurring Revenue |
| Churn Rate | <5% | Monthly subscription cancellation rate |
| Payment Success Rate | >95% | Successful payment attempts |
| ARPU | ₺500+ | Average Revenue Per User (salon) |
| Upgrade Rate | - | Monthly to yearly conversion rate |

---

## Go-to-Market Strategy

### Customer Acquisition

| Channel | Strategy | Priority |
|---------|----------|----------|
| **Digital Marketing** | SEO, Google Ads, social media campaigns | Primary |
| **Field Sales** | Direct salon visits, demos, local partnerships | Primary |

### Launch Strategy

- No specific launch date pressure - quality over speed
- Gradual rollout starting with Istanbul
- Focus on salon onboarding quality

### Trial Policy

| Aspect | Decision |
|--------|----------|
| **Free Trial** | None |
| **Rationale** | Premium positioning, serious customers only |
| **Alternative** | Live demo sessions, video walkthroughs |

---

## Onboarding Strategy

### Self-Service Onboarding

| Resource | Description |
|----------|-------------|
| **Video Tutorials** | Step-by-step guides for each feature |
| **Documentation** | Written guides with screenshots |
| **In-App Tooltips** | Contextual help during first use |
| **Setup Wizard** | Guided initial configuration |

### Onboarding Flow

1. Account creation with business details
2. Service catalog setup (guided wizard)
3. Staff member invitation
4. Business hours configuration
5. First appointment booking (test)

---

## Customer Support Strategy

### Support Channels

| Channel | Availability | Response Time |
|---------|--------------|---------------|
| **Email** | 24/7 | < 24 hours |
| **WhatsApp** | Business hours | < 2 hours |
| **Phone** | Business hours | Immediate |

### Support Priorities

1. Critical issues (booking failures, data loss) - Immediate response
2. Feature questions - Same business day
3. Enhancement requests - Logged for review

---

## Product Principles

### 1. Simplicity First

The system should be usable by salon staff with minimal training. Complex features are exposed progressively, not all at once.

### 2. Real-Time by Default

All data syncs in real-time across devices. No refresh buttons, no stale data, no double-bookings.

### 3. Mobile-Ready

While the primary admin interface is desktop-optimized, customer booking and staff views must work seamlessly on mobile.

### 4. Turkish Market Fit

Localization goes beyond language - the system understands Turkish business practices, naming conventions, and cultural expectations.

### 5. Data Ownership

Salon data belongs to the salon. Clear export options and no vendor lock-in practices.

---

## Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Advantage |
|------------|-----------|------------|---------------|
| Fresha | Feature-rich, global | Not Turkey-focused, complex | Local market fit, simplicity |
| Randevu.com | Turkish market | Dated UI, limited features | Modern UX, real-time |
| Pen & Paper | No cost, familiar | Error-prone, no insights | Automation, analytics |
| WhatsApp | Already used | Unstructured, no tracking | Structured booking, reporting |

---

## Constraints & Assumptions

### Constraints

1. **Budget:** Bootstrapped MVP, cost-effective infrastructure choices
2. **Timeline:** MVP within reasonable development period
3. **Team:** Small development team (1-3 developers)
4. **Regulations:** KVKK (Turkish GDPR) compliance required

### Assumptions

1. Target users have reliable internet access
2. Smartphones are the primary device for customers
3. Email is acceptable for notifications (SMS as P2)
4. Single location per tenant is sufficient for MVP
5. Online payment processing can be deferred to post-MVP

---

## Key Product Decisions

### Customer Account Model: Hybrid

| Scenario | Behavior |
|----------|----------|
| First booking | Customer books as **guest** (phone + OTP verification) |
| Repeat customer | System recognizes phone number, pre-fills info |
| 3+ bookings | Customer receives **account creation prompt** |
| Account benefits | View history, manage preferences, faster booking |

**Rationale:** Reduces friction for first-time bookings while encouraging account creation for engaged customers.

### Language Support

| Language | Availability | Scope |
|----------|--------------|-------|
| **English** | MVP (Primary) | Full UI, initial development |
| **Turkish** | Post-MVP | Full UI, localization phase |

**i18n Strategy:**
- English is the primary development language
- Turkish localization added after core features stabilize
- i18n architecture built from day one (react-i18next)
- Users can switch language in settings
- Default based on browser locale
- All notifications sent in user's preferred language

### Platform Strategy

| Platform | MVP | Future |
|----------|-----|--------|
| **Responsive Web** | ✅ | ✅ |
| **Native Mobile Apps** | ❌ | TBD |
| **PWA** | ❌ | TBD |

**Design Approach:**
- Mobile-first responsive design
- Works on all devices (phone, tablet, desktop)
- No app store presence required for MVP
- Reduces development and maintenance overhead

### Location Model

| Capability | MVP | v2.0+ |
|------------|-----|-------|
| Single location per salon | ✅ | ✅ |
| Multi-location support | ❌ | ✅ |

**MVP Constraint:** Each organization = one physical location. Multi-location chains create separate accounts or wait for v2.0.

### Role Hierarchy

```
Owner (Owner)
  └── Full access to everything
  └── Billing, settings, data export

Admin (Manager)
  └── Manage all bookings & schedules
  └── Approve time-off requests
  └── View reports
  └── Cannot access billing/settings

Staff (Employee)
  └── View own schedule only
  └── Cannot see other staff schedules
  └── Cannot manage bookings for others
```

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption | High | Medium | Focus on onboarding quality, video tutorials, live demos |
| Convex scalability | High | Low | Monitor usage, have migration plan |
| Competition enters market | Medium | Medium | Build strong customer relationships, local market focus |
| KVKK compliance issues | High | Low | Legal review, data handling policies |
| No-show rate doesn't improve | Medium | Medium | Implement OTP verification, deposits (v2.0) |
| Support capacity | Medium | Medium | Self-service resources, prioritized support channels |
| Payment failures | High | Medium | 7-day grace period, multiple retry attempts, clear communication |
| High churn rate | High | Medium | Yearly discount incentive, engagement tracking, proactive outreach |
| Polar.sh service disruption | High | Low | Webhook retry mechanism, manual payment fallback, monitoring alerts |

---

## User Stories

This section contains all user stories organized by persona. Each story follows the format:

```
As a [persona],
I want to [action],
So that [benefit].

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
```

### Salon Owner Stories (Owner)

#### US-001: Initial Salon Setup [P0]

**As a** salon owner,
**I want to** set up my salon profile with basic information,
**So that** customers can find and recognize my business.

**Acceptance Criteria:**
- [ ] Can enter salon name, description, and contact info
- [ ] Can upload salon logo (max 2MB, jpg/png)
- [ ] Can set business hours for each day of the week
- [ ] Can specify salon address with map preview
- [ ] Can set timezone (defaults to Europe/Istanbul)
- [ ] Profile is immediately visible after save

#### US-002: Service Catalog Management [P0]

**As a** salon owner,
**I want to** create and manage my service catalog,
**So that** customers know what services I offer and their prices.

**Acceptance Criteria:**
- [ ] Can add service with name, description, duration, and price
- [ ] Can organize services into categories (e.g., Hair, Nails, Makeup)
- [ ] Can set service as active/inactive without deleting
- [ ] Can specify which staff members can perform each service
- [ ] Price displayed in TRY (₺) format
- [ ] Duration in 15-minute increments (15min - 4hrs)

#### US-003: Staff Member Onboarding [P0]

**As a** salon owner,
**I want to** add staff members to my salon,
**So that** they can be assigned to appointments.

**Acceptance Criteria:**
- [ ] Can invite staff via email (sends Better Auth invitation)
- [ ] Can set staff role (Admin, Member)
- [ ] Can assign services staff member can perform
- [ ] Can set staff working hours (default or custom)
- [ ] Can upload staff profile photo
- [ ] Staff appears in booking widget after activation

#### US-004: View Business Dashboard [P0]

**As a** salon owner,
**I want to** see an overview of my business performance,
**So that** I can make informed decisions.

**Acceptance Criteria:**
- [ ] Dashboard shows today's appointments count
- [ ] Shows upcoming appointments for next 7 days
- [ ] Shows revenue summary (today, this week, this month)
- [ ] Shows no-show count and rate
- [ ] Shows staff utilization percentage
- [ ] Data refreshes in real-time

#### US-005: Generate Reports [P1]

**As a** salon owner,
**I want to** generate business reports,
**So that** I can analyze trends and performance.

**Acceptance Criteria:**
- [ ] Can generate revenue report by date range
- [ ] Can generate staff performance report
- [ ] Can generate service popularity report
- [ ] Can generate customer retention report
- [ ] Reports can be exported as CSV
- [ ] Date range defaults to current month

#### US-006: Manage Staff Permissions [P0]

**As a** salon owner,
**I want to** control what staff members can access,
**So that** sensitive business data is protected.

**Acceptance Criteria:**
- [ ] Can set role-based permissions (Owner, Admin, Member)
- [ ] Member role can only view/manage own schedule
- [ ] Admin role can manage all bookings and staff
- [ ] Owner role has full access including settings
- [ ] Permissions apply immediately after change

### Admin/Member Stories

> **Note:** The system has 3 roles (Owner > Admin > Member). There is no separate "Receptionist" role - front desk duties are performed by Admin or Owner.

#### US-010: View Daily Schedule [P0]

**As an** admin/owner,
**I want to** see today's schedule at a glance,
**So that** I can manage the day efficiently.

**Acceptance Criteria:**
- [ ] Shows all appointments for selected date
- [ ] Can filter by staff member
- [ ] Shows appointment status (confirmed, checked-in, completed, no-show)
- [ ] Shows customer name and service for each slot
- [ ] Can navigate between days easily
- [ ] Schedule updates in real-time (no refresh needed)

#### US-011: Book Walk-in Appointment (Quick Form) [P0]

**As an** admin/owner,
**I want to** quickly book a walk-in customer using a minimal form,
**So that** they can be served without waiting.

**Acceptance Criteria:**
- [ ] Quick form requires only: customer name, phone number
- [ ] Email is NOT required for walk-in bookings
- [ ] System auto-selects "now" or next available slot
- [ ] Can select staff member or use "any available"
- [ ] Can add multiple services to one appointment
- [ ] Appointment created with status "checked_in" (already arrived)
- [ ] Skips OTP verification (staff-initiated booking)
- [ ] Customer record created/linked automatically by phone
- [ ] Booking completed within 30 seconds

**Walk-in Form Fields:**
| Field | Required | Default |
|-------|----------|---------|
| Customer Name | Yes | - |
| Phone | Yes | - |
| Email | No | - |
| Service(s) | Yes | - |
| Staff | No | Any available |
| Start Time | No | Now |

#### US-012: Check-in Customer [P0]

**As an** admin/owner,
**I want to** mark a customer as arrived,
**So that** staff knows who to call next.

**Acceptance Criteria:**
- [ ] Can check-in customer with one click
- [ ] Check-in updates appointment status
- [ ] Arrival time is recorded
- [ ] Staff assigned sees notification (real-time)
- [ ] Can check-in up to 30 minutes before appointment

#### US-013: Process Checkout [P1]

**As an** admin/owner,
**I want to** complete an appointment checkout,
**So that** the visit is properly recorded.

**Acceptance Criteria:**
- [ ] Can mark appointment as completed
- [ ] Can add products purchased during visit
- [ ] Shows total amount (services + products)
- [ ] Can record payment method (cash, card, other)
- [ ] Generates receipt (display/print option)
- [ ] Customer history updated automatically

#### US-014: Manage Cancellations [P0]

**As an** admin/owner,
**I want to** cancel or reschedule appointments,
**So that** the schedule stays accurate.

**Acceptance Criteria:**
- [ ] Can cancel appointment with reason (required)
- [ ] Can reschedule to different date/time/staff
- [ ] Customer receives notification of change (email)
- [ ] Cancelled slot becomes available immediately
- [ ] Cancellation history recorded on customer profile

#### US-015: Mark No-Show [P0]

**As an** admin/owner,
**I want to** mark a customer as no-show,
**So that** we can track reliability and free up the slot.

**Acceptance Criteria:**
- [ ] Can mark as no-show if 15+ minutes past appointment time
- [ ] No-show recorded on customer history (informational only)
- [ ] **No penalty or blocking** - customer can still book
- [ ] Slot freed for walk-ins
- [ ] Dashboard no-show count updated
- [ ] Customer's no-show count visible on their profile

#### US-016: Request Time-Off [P0]

**As a** staff member,
**I want to** request time off,
**So that** I can take vacation or handle personal matters.

**Acceptance Criteria:**
- [ ] Can select date range (start and end date)
- [ ] Can select type (vacation, sick, personal, other)
- [ ] Can add optional reason/note
- [ ] System shows if there are existing appointments in range
- [ ] Request status is "pending" until approved
- [ ] Receives notification when approved/rejected

#### US-017: Approve Time-Off Request [P0]

**As an** admin/owner,
**I want to** approve or reject time-off requests,
**So that** I can manage staff availability.

**Acceptance Criteria:**
- [ ] Can view all pending time-off requests
- [ ] System shows affected appointments (if any)
- [ ] Can approve with automatic handling of appointments:
  - [ ] Reassign to different staff, OR
  - [ ] Cancel with customer notification
- [ ] Can reject with reason
- [ ] Staff notified of decision
- [ ] Approved time-off creates schedule overrides

#### US-018: Advanced Customer Search [P1]

**As an** admin/owner,
**I want to** search and filter customers by various criteria,
**So that** I can find specific customers and segment my clientele.

**Acceptance Criteria:**
- [ ] Can search by name, phone, or email
- [ ] Can filter by last visit date (today, 7 days, 30 days, 90 days, >90 days)
- [ ] Can filter by total visits (1, 2-5, 6-10, 10+)
- [ ] Can filter by total spending (ranges in TRY)
- [ ] Can filter by no-show history
- [ ] Can filter by tags (VIP, Frequent, etc.)
- [ ] Can filter by source (online, walk-in, phone)
- [ ] Can export results to CSV
- [ ] Can bulk-send email to filtered customers (future)

**Filter Presets:**
- VIP Customers: 10+ visits OR ₺5,000+ spending
- At Risk: Last visit > 90 days, 3+ previous visits
- New This Month: First visit in current month

#### US-019: Define Overtime Availability [P1]

**As a** staff member,
**I want to** mark myself available outside regular hours,
**So that** I can accept appointments during overtime.

**Acceptance Criteria:**
- [ ] Can add overtime slots for specific dates
- [ ] Can specify start and end time
- [ ] Can add optional note (e.g., "VIP clients only")
- [ ] Overtime slots appear in booking availability
- [ ] Can delete overtime slots
- [ ] Only affects my own schedule

### Customer Stories (End User)

#### US-020: Browse Services [P0]

**As a** customer,
**I want to** browse available services and prices,
**So that** I can decide what to book.

**Acceptance Criteria:**
- [ ] Can view all active services
- [ ] Services grouped by category
- [ ] Each service shows name, description, duration, price
- [ ] Prices displayed in TRY (₺)
- [ ] Can proceed to booking from service detail

#### US-021: Book Appointment Online [P0]

**As a** customer,
**I want to** book an appointment online,
**So that** I don't have to call the salon.

**Acceptance Criteria:**
- [ ] Can select one or more services
- [ ] Can optionally select preferred staff member
- [ ] System shows available time slots
- [ ] Can select date and time
- [ ] Prompted to enter contact info (phone, email)
- [ ] Must verify phone with OTP
- [ ] Receives confirmation after booking

**Booking Flow:**
1. Select service(s)
2. Select staff (optional - "Any available" default)
3. Select date
4. Select available time slot
5. Enter customer info
6. Verify phone with OTP
7. Confirm booking
8. Receive confirmation

#### US-022: View Available Slots [P0]

**As a** customer,
**I want to** see which time slots are available,
**So that** I can choose a convenient time.

**Acceptance Criteria:**
- [ ] Available slots shown for selected date
- [ ] Unavailable slots are hidden or grayed out
- [ ] Can navigate between dates (next 30 days)
- [ ] Slots update in real-time if others book
- [ ] Loading state while fetching availability
- [ ] "No availability" message if fully booked

#### US-023: Receive Booking Confirmation [P0]

**As a** customer,
**I want to** receive confirmation of my booking,
**So that** I know it was successful.

**Acceptance Criteria:**
- [ ] Confirmation shown on screen immediately
- [ ] Email confirmation sent within 1 minute
- [ ] Confirmation includes: date, time, service, staff, salon address
- [ ] Includes link to manage booking
- [ ] Includes calendar invite attachment (.ics)

#### US-024: Receive Appointment Reminder [P1]

**As a** customer,
**I want to** receive a reminder before my appointment,
**So that** I don't forget to show up.

**Acceptance Criteria:**
- [ ] Email reminder sent 24 hours before
- [ ] Reminder includes appointment details
- [ ] Includes link to reschedule/cancel
- [ ] Reminder sent only for confirmed appointments

#### US-025: Cancel Appointment [P0]

**As a** customer,
**I want to** cancel my appointment,
**So that** the salon can offer the slot to others.

**Acceptance Criteria:**
- [ ] Can cancel from booking confirmation link
- [ ] Can cancel via customer portal (if logged in)
- [ ] Must confirm cancellation
- [ ] Slot freed immediately
- [ ] Receives cancellation confirmation email
- [ ] Cancellation allowed up to 2 hours before

#### US-026: Reschedule Appointment [P1]

**As a** customer,
**I want to** change my appointment time,
**So that** I can adjust to schedule changes.

**Acceptance Criteria:**
- [ ] Can reschedule from booking confirmation link
- [ ] Shows available slots (same as new booking)
- [ ] Original slot freed when new slot confirmed
- [ ] Receives new confirmation email
- [ ] Reschedule allowed up to 2 hours before

#### US-027: View Booking History [P1]

**As a** customer,
**I want to** see my past appointments,
**So that** I can track my visits and rebook favorites.

**Acceptance Criteria:**
- [ ] Customer portal shows past appointments
- [ ] Shows service, staff, date, price
- [ ] Can "book again" from past appointment
- [ ] Shows upcoming appointments separately
- [ ] Requires authentication (email magic link)

### System Stories (Administrative)

#### US-030: Multi-Tenant Isolation [P0]

**As a** system administrator,
**I want to** ensure tenant data is completely isolated,
**So that** salons cannot access each other's data.

**Acceptance Criteria:**
- [ ] All database queries filter by organizationId
- [ ] API endpoints validate organization ownership
- [ ] Staff can only access their assigned organization
- [ ] URL structure includes organization slug
- [ ] Cross-tenant data access returns 403

#### US-031: Real-Time Synchronization [P0]

**As a** system administrator,
**I want to** ensure all data syncs in real-time,
**So that** double-bookings are prevented.

**Acceptance Criteria:**
- [ ] Convex subscriptions used for all list views
- [ ] Slot availability updates within 100ms
- [ ] Concurrent booking attempts handled gracefully
- [ ] Optimistic locking on appointment creation
- [ ] Conflict shows user-friendly error message

#### US-032: Audit Logging [P1]

**As a** system administrator,
**I want to** track important actions,
**So that** we can investigate issues and ensure compliance.

**Acceptance Criteria:**
- [ ] Login/logout events logged
- [ ] Appointment create/update/cancel logged
- [ ] Staff permission changes logged
- [ ] Logs include timestamp, user, action, details
- [ ] Logs retained for 90 days

### Subscription & Billing Stories (P0)

#### US-040: Subscribe to Platform [P0]

**As a** salon owner,
**I want to** subscribe to the platform,
**So that** I can use the salon management features.

**Acceptance Criteria:**
- [ ] Can view subscription plan details (features, price)
- [ ] Can select billing period (monthly ₺500/mo or yearly ₺5,100/yr)
- [ ] Yearly option shows 15% savings clearly
- [ ] Redirected to Polar checkout page
- [ ] Card payment processed securely via Polar
- [ ] Subscription activated immediately after payment
- [ ] Confirmation email sent with invoice
- [ ] Dashboard shows active subscription status
- [ ] Next billing date displayed

#### US-041: Manage Subscription [P0]

**As a** salon owner,
**I want to** view and manage my subscription,
**So that** I can track my billing status.

**Acceptance Criteria:**
- [ ] Can view current plan and billing period
- [ ] Can see subscription status (active, past_due, etc.)
- [ ] Can see next billing date and amount
- [ ] Can access Polar customer portal for detailed management
- [ ] Can upgrade from monthly to yearly (prorated)
- [ ] Subscription widget visible on admin dashboard

#### US-042: Update Payment Method [P0]

**As a** salon owner,
**I want to** update my payment method,
**So that** my subscription continues without interruption.

**Acceptance Criteria:**
- [ ] Can access payment method management via Polar portal
- [ ] Can add new card
- [ ] Can remove old card (if another exists)
- [ ] Can set default payment method
- [ ] Changes take effect for next billing cycle
- [ ] Immediate retry option if in past_due status

#### US-043: View Billing History [P0]

**As a** salon owner,
**I want to** view my billing history,
**So that** I can track expenses and get invoices.

**Acceptance Criteria:**
- [ ] Can view list of past payments
- [ ] Each entry shows date, amount, status, billing period
- [ ] Can download invoice/receipt for each payment (PDF)
- [ ] History accessible via Polar customer portal
- [ ] Last 12 months minimum visible

#### US-044: Handle Failed Payment [P0]

**As a** salon owner,
**I want to** be notified when my payment fails,
**So that** I can update my payment method before losing access.

**Acceptance Criteria:**
- [ ] Email notification sent immediately on payment failure
- [ ] Dashboard shows prominent warning banner
- [ ] 7-day grace period to resolve
- [ ] Reminder emails sent on day 1, 3, 5, 7
- [ ] Clear instructions on how to update payment
- [ ] Account suspended after grace period (billing page only)
- [ ] Can reactivate immediately by updating payment method

**Grace Period Email Schedule:**
| Day | Email Content |
|-----|---------------|
| 0 | "Payment failed - please update your card" |
| 3 | "Reminder: Update payment to avoid service interruption" |
| 5 | "Warning: 2 days left to update payment" |
| 7 | "Final notice: Account will be suspended today" |

#### US-045: Cancel Subscription [P0]

**As a** salon owner,
**I want to** cancel my subscription,
**So that** I can stop being charged.

**Acceptance Criteria:**
- [ ] Can initiate cancellation from settings or Polar portal
- [ ] Must confirm cancellation (prevent accidental)
- [ ] Access continues until end of current billing period
- [ ] Cancellation confirmation email sent
- [ ] Can resubscribe anytime
- [ ] Data retained for 30 days after subscription expires
- [ ] Clear messaging about when access ends

---

## Edge Cases & Error Handling

This section catalogs edge cases, error scenarios, and their prescribed handling.

### Hybrid Account Model Edge Cases

#### EC-HAM-001: Guest Upgrades Mid-Booking

**Scenario:** Guest (3+ visits) decides to create account during booking flow.

**Handling:**
1. Preserve current booking progress
2. Show quick account creation (email + magic link)
3. After account created, link existing customer record to new user
4. Continue booking with authenticated session
5. Merge any duplicate customer records

#### EC-HAM-002: Phone Number Already Registered

**Scenario:** Guest tries to book with phone number already linked to a registered account.

**Handling:**
```typescript
// During phone verification
const existingCustomer = await findCustomerByPhone(phone);
if (existingCustomer?.userId) {
  // Prompt to log in instead
  throw new ConvexError({
    code: ErrorCode.ALREADY_EXISTS,
    message: "This phone is linked to an account. Please log in to continue.",
    loginPrompt: true,
  });
}
```

**UX:**
```
This phone number is linked to an existing account.
Please log in to manage your bookings.

[Log In]  [Use Different Phone]
```

### Booking Edge Cases

#### EC-001: Double Booking Race Condition

**Scenario:** Two customers simultaneously select the same time slot.

**Detection:** Slot lock acquisition fails for second user.

**Handling:**
```typescript
// When lock acquisition fails
try {
  await acquireSlotLock(slot);
} catch (error) {
  if (error.code === ErrorCode.VALIDATION_ERROR) {
    // Show user-friendly message
    showToast("This slot is being booked by another user. Please select a different time.");
    // Refresh available slots
    refetchSlots();
  }
}
```

**UX:**
- Real-time slot availability updates via Convex subscription
- Slots turn gray/disabled when locked by others
- Message: "This time is being booked. Please select another slot."

#### EC-002: Lock Expiration During Form Fill

**Scenario:** Customer takes too long filling out contact information, lock expires.

**Detection:** Lock TTL (2 minutes) exceeded.

**Handling:**
1. Show warning at 30 seconds remaining
2. Attempt to extend lock when form submitted
3. If extension fails, check if slot still available
4. If available, re-acquire lock and continue
5. If unavailable, show error and return to slot selection

**UX:**
```
⚠️ Your slot reservation expires in 30 seconds. Please complete your booking.
[I need more time] [Complete now]
```

#### EC-003: OTP Verification Timeout

**Scenario:** Customer doesn't enter OTP within 5-minute window.

**Handling:**
1. Code expires after 5 minutes
2. Show "Code expired" message
3. Offer "Resend code" button (60-second cooldown between sends)
4. Slot lock released after OTP timeout
5. Customer must restart booking flow

**Rate Limits:**
- Max 3 verification attempts per code
- Max 5 codes sent per phone per hour
- 60-second minimum between code requests

### Payment Edge Cases - SaaS Subscription (MVP)

#### EC-PAY-001: Card Declined During Checkout

**Scenario:** Customer's card is declined during subscription checkout on Polar.

**Handling:**
- Polar shows clear error message on checkout page
- Customer can retry with different card
- No subscription created until payment succeeds
- Organization remains in trial/inactive state
- Log checkout attempt for analytics

**UX:**
```
Payment Failed

Your card was declined. Please try a different payment method.

[Try Different Card]  [Contact Support]
```

#### EC-PAY-002: Subscription Expires During Active Appointment

**Scenario:** Organization's subscription expires/suspends while customer has active appointment in progress.

**Handling:**
1. Current appointments continue uninterrupted
2. Suspension takes effect after appointment completes
3. No new appointments can be created
4. Staff can complete checkout for active appointments
5. Dashboard shows suspension warning
6. Redirect to billing page after appointment completion

**Policy:**
- In-progress appointments are never interrupted
- Suspension only affects new operations
- Customer experience is protected

#### EC-PAY-003: Webhook Delivery Failure

**Scenario:** Polar webhook fails to deliver (network issue, our server down).

**Handling:**
1. Polar automatically retries (exponential backoff)
2. Webhook endpoint implements idempotency
3. Use `polarEventId` to detect duplicate events
4. Manual sync option available for support team
5. Alert if webhook delivery consistently fails

**Implementation:**
```typescript
// Check for duplicate event
const existingEvent = await ctx.db
  .query("subscriptionEvents")
  .withIndex("by_event_id", (q) => q.eq("polarEventId", event.id))
  .first();

if (existingEvent) {
  // Already processed, return 200 to stop retries
  return new Response("Already processed", { status: 200 });
}
```

**Retry Schedule (Polar):**
| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 12 hours |
| 7 | 24 hours |

#### EC-PAY-004: Grace Period Expiry

**Scenario:** Organization fails to update payment within 7-day grace period.

**Handling:**
1. Day 7 reminder sent with final warning
2. Grace period ends at exact time of original failure + 7 days
3. Status changes from `past_due` to `suspended`
4. All access locked except billing page
5. Suspension email sent immediately
6. Data retained for 30 days

**Suspended State Access:**
| Feature | Access |
|---------|--------|
| Billing page | ✅ Allowed |
| Dashboard | ❌ Blocked |
| Calendar | ❌ Blocked |
| Appointments | ❌ Blocked |
| API calls | ❌ Blocked |
| Customer booking | ❌ Blocked |

**UX (Suspended Page):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                      ⚠️ Account Suspended                               │
│                                                                         │
│  Your subscription payment has failed and your account is suspended.   │
│                                                                         │
│  Your data is safe and will be retained for 30 days.                   │
│  Update your payment method to restore access immediately.             │
│                                                                         │
│                        [Update Payment Method]                          │
│                                                                         │
│                        Need help? Contact Support                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Error Message Guidelines

**User-Facing Error Messages:**

| Code | Message | Action |
|------|---------|--------|
| `SLOT_UNAVAILABLE` | "This time slot is no longer available. Please select another time." | Show slot picker |
| `LOCK_EXPIRED` | "Your slot reservation expired. Please select a time again." | Restart flow |
| `INVALID_OTP` | "Incorrect code. Please try again." | Clear input, focus |
| `OTP_EXPIRED` | "Code expired. Click 'Resend' to get a new code." | Show resend button |
| `RATE_LIMITED` | "Too many attempts. Please wait [X] seconds." | Show countdown |
| `PERMISSION_DENIED` | "You don't have permission to perform this action." | N/A |
| `NOT_FOUND` | "The requested resource was not found." | Redirect to safe page |
| `NETWORK_ERROR` | "Connection lost. Please check your internet and try again." | Show retry button |

**Technical Error Messages (Logs Only):**

Detailed technical messages should:
- Go to error tracking (Sentry)
- Include request ID for support
- Never expose to end users
- Contain stack traces and context

**See also:** [Full edge cases documentation](./appendix/edge-cases.md) for complete details on all scenarios.

---

## Future Roadmap

This section outlines features planned for post-MVP releases.

### Version Overview

| Version | Focus | Target |
|---------|-------|--------|
| v1.0 (MVP) | Core booking, staff management, **SaaS billing** | Initial release |
| v1.1 | Enhanced notifications, Turkish i18n | Post-MVP quick wins |
| v1.2 | Customer loyalty, advanced analytics | Growth features |
| v2.0 | Customer payments, multi-location | Major expansion |
| v2.x | AI features, marketplace | Future vision |

> **Note:** SaaS subscription billing via Polar.sh is included in MVP (v1.0). Customer payment processing (deposits, prepayments for appointments) is planned for v2.0.

### P2 Features (v1.1 - v1.2)

**SMS Notifications (v1.1)**
- Integration with Turkish SMS provider (Netgsm, Iletimerkezi)
- SMS templates for: confirmation, reminder, cancellation
- Opt-in/opt-out per customer
- Character limit handling (Turkish characters)
- Delivery status tracking
- Cost tracking per organization

**WhatsApp Integration (v1.2)**
- WhatsApp Business API integration
- Template messages (pre-approved)
- Interactive booking confirmations
- Quick reply buttons for confirm/cancel
- Higher open rates than SMS

**Waitlist Management (v1.1)**
- Customer can request specific date/time/staff
- Notification when slot becomes available
- First-come-first-served or priority-based
- Auto-expire waitlist entries after 24h
- Admin can manually offer slots to waitlist

**Recurring Appointments (v1.2)**
- Set recurrence: weekly, bi-weekly, monthly
- Choose end date or number of occurrences
- Manage series (edit single vs all)
- Conflict detection for future dates
- Bulk cancellation of series

**Advanced Analytics (v1.2)**
- Revenue forecasting (based on bookings)
- Staff utilization heatmaps
- Customer cohort analysis
- Service performance trends
- Peak hours analysis
- No-show prediction

**Customer Loyalty Program (v1.2)**
- Points-based system to encourage repeat visits
- Earn points per visit (configurable rate)
- Redeem points for discounts
- Tier levels (Bronze, Silver, Gold)
- Points expiration policy

### P3 Features (v2.0+)

**Customer Payment Processing (v2.0)**
- One-time appointment payments via @polar-sh/sdk
- Deposit collection (% of service price)
- Full prepayment option
- Refund processing
- Receipt/invoice generation for customers
- Financial reporting for salon owners

> **Note:** Platform subscription billing is P0 and implemented in MVP via Polar.sh. This section covers customer-facing payments only.

**Multi-Location Support (v2.0)**
- Single organization with multiple physical locations
- Staff assigned to specific location(s)
- Services per location (optional)
- Location-specific business hours
- Customer chooses location when booking
- Consolidated reporting across locations

**Online Payments for Products (v2.1)**
- Product catalog with online purchasing
- Shopping cart
- Shipping or in-store pickup
- Order management
- Integration with existing product inventory

**Mobile Applications (v2.x)**
- React Native for code sharing with web
- Push notifications
- Offline appointment viewing
- Biometric login
- Camera for profile photos

> **Note:** There is no PWA currently. The web app is a standard Next.js application.

**AI-Powered Features (v2.x)**
- Smart Scheduling: suggest optimal times based on staff efficiency
- No-Show Prediction: flag high-risk bookings, require deposit
- Service Recommendations: suggest add-on services
- Demand Forecasting: predict busy periods

**Marketplace / Discovery (v3.0)**
- Public salon directory
- Search by location, service, rating
- Customer reviews and ratings
- Featured salon listings (paid)
- Booking directly from marketplace

### Technical Debt & Infrastructure

**Performance Optimization (Ongoing)**
- Database query optimization
- Image CDN for photos
- Edge caching for static content
- Bundle size reduction
- Core Web Vitals monitoring

**Monitoring & Observability (v1.1)**
- Structured logging
- Performance dashboards
- Alerting for anomalies
- Error rate monitoring
- User session recording (privacy-compliant)

**Security Enhancements (v1.1)**
- ~~Rate limiting per endpoint~~ (Already implemented via `convex/lib/rateLimits.ts`)
- Brute force protection
- Security audit
- Penetration testing
- SOC 2 preparation

**Developer Experience (Ongoing)**
- Comprehensive API documentation
- SDK for integrations
- Webhook system for events
- Sandbox environment for testing

### Version Release Cadence

| Type | Frequency | Contents |
|------|-----------|----------|
| Patch (x.x.1) | As needed | Bug fixes, security patches |
| Minor (x.1.0) | Monthly | New features, improvements |
| Major (2.0.0) | Yearly | Breaking changes, major features |

All releases follow semantic versioning principles.

---

## Cross-References

**Related Documentation:**
- [Database Schema](./database-schema.md) - Complete Convex schema
- [API Reference](./api-reference.md) - All Convex functions
- [System Architecture](./system-architecture.md) - Tech stack, deployment
- [Features](./features.md) - Detailed feature specifications
- [Design System](./design-system.md) - UI/UX patterns
- [Glossary](./glossary.md) - Domain terminology
