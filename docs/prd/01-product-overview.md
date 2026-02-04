# 01 - Product Overview

## Vision Statement

To become the leading salon management platform in Turkey by providing an intuitive, all-in-one solution that empowers beauty professionals to focus on their craft while the system handles scheduling, customer relationships, and business operations.

---

## Problem Statement

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

### Persona 1: Salon Owner - Ahmet (Super Admin)

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

> **Note:** The system has 3 roles: **Owner** (full access), **Admin** (manages bookings & staff schedules), **Staff** (views own schedule only). There is no separate "Receptionist" role - front desk duties are handled by Admin or Owner.

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

## Success Metrics (KPIs)

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
Owner (Super Admin)
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
