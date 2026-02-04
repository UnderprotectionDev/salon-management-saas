# 02 - User Stories

This document contains all user stories organized by persona. Each story follows the format:

```
As a [persona],
I want to [action],
So that [benefit].

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## Salon Owner Stories (Super Admin)

### US-001: Initial Salon Setup [P0]

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

---

### US-002: Service Catalog Management [P0]

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

---

### US-003: Staff Member Onboarding [P0]

**As a** salon owner,
**I want to** add staff members to my salon,
**So that** they can be assigned to appointments.

**Acceptance Criteria:**
- [ ] Can invite staff via email (sends Better Auth invitation)
- [ ] Can set staff role (Admin, Staff)
- [ ] Can assign services staff member can perform
- [ ] Can set staff working hours (default or custom)
- [ ] Can upload staff profile photo
- [ ] Staff appears in booking widget after activation

---

### US-004: View Business Dashboard [P0]

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

---

### US-005: Generate Reports [P1]

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

---

### US-006: Manage Staff Permissions [P0]

**As a** salon owner,
**I want to** control what staff members can access,
**So that** sensitive business data is protected.

**Acceptance Criteria:**
- [ ] Can set role-based permissions (Owner, Admin, Staff)
- [ ] Staff role can only view/manage own schedule
- [ ] Admin role can manage all bookings and staff
- [ ] Owner role has full access including settings
- [ ] Permissions apply immediately after change

---

## Admin/Staff Stories

> **Note:** The system has 3 roles (Owner > Admin > Staff). There is no separate "Receptionist" role - front desk duties are performed by Admin or Owner.

### US-010: View Daily Schedule [P0]

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

---

### US-011: Book Walk-in Appointment (Quick Form) [P0]

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

---

### US-012: Check-in Customer [P0]

**As an** admin/owner,
**I want to** mark a customer as arrived,
**So that** staff knows who to call next.

**Acceptance Criteria:**
- [ ] Can check-in customer with one click
- [ ] Check-in updates appointment status
- [ ] Arrival time is recorded
- [ ] Staff assigned sees notification (real-time)
- [ ] Can check-in up to 30 minutes before appointment

---

### US-013: Process Checkout [P1]

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

---

### US-014: Manage Cancellations [P0]

**As an** admin/owner,
**I want to** cancel or reschedule appointments,
**So that** the schedule stays accurate.

**Acceptance Criteria:**
- [ ] Can cancel appointment with reason (required)
- [ ] Can reschedule to different date/time/staff
- [ ] Customer receives notification of change (email)
- [ ] Cancelled slot becomes available immediately
- [ ] Cancellation history recorded on customer profile

---

### US-015: Mark No-Show [P0]

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

---

### US-016: Request Time-Off [P0]

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

---

### US-017: Approve Time-Off Request [P0]

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

---

### US-018: Advanced Customer Search [P1]

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

---

### US-019: Define Overtime Availability [P1]

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

---

## Customer Stories (End User)

### US-020: Browse Services [P0]

**As a** customer,
**I want to** browse available services and prices,
**So that** I can decide what to book.

**Acceptance Criteria:**
- [ ] Can view all active services
- [ ] Services grouped by category
- [ ] Each service shows name, description, duration, price
- [ ] Prices displayed in TRY (₺)
- [ ] Can proceed to booking from service detail

---

### US-021: Book Appointment Online [P0]

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

---

### US-022: View Available Slots [P0]

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

---

### US-023: Receive Booking Confirmation [P0]

**As a** customer,
**I want to** receive confirmation of my booking,
**So that** I know it was successful.

**Acceptance Criteria:**
- [ ] Confirmation shown on screen immediately
- [ ] Email confirmation sent within 1 minute
- [ ] Confirmation includes: date, time, service, staff, salon address
- [ ] Includes link to manage booking
- [ ] Includes calendar invite attachment (.ics)

---

### US-024: Receive Appointment Reminder [P1]

**As a** customer,
**I want to** receive a reminder before my appointment,
**So that** I don't forget to show up.

**Acceptance Criteria:**
- [ ] Email reminder sent 24 hours before
- [ ] Reminder includes appointment details
- [ ] Includes link to reschedule/cancel
- [ ] Reminder sent only for confirmed appointments

---

### US-025: Cancel Appointment [P0]

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

---

### US-026: Reschedule Appointment [P1]

**As a** customer,
**I want to** change my appointment time,
**So that** I can adjust to schedule changes.

**Acceptance Criteria:**
- [ ] Can reschedule from booking confirmation link
- [ ] Shows available slots (same as new booking)
- [ ] Original slot freed when new slot confirmed
- [ ] Receives new confirmation email
- [ ] Reschedule allowed up to 2 hours before

---

### US-027: View Booking History [P1]

**As a** customer,
**I want to** see my past appointments,
**So that** I can track my visits and rebook favorites.

**Acceptance Criteria:**
- [ ] Customer portal shows past appointments
- [ ] Shows service, staff, date, price
- [ ] Can "book again" from past appointment
- [ ] Shows upcoming appointments separately
- [ ] Requires authentication (email magic link)

---

## System Stories (Administrative)

### US-030: Multi-Tenant Isolation [P0]

**As a** system administrator,
**I want to** ensure tenant data is completely isolated,
**So that** salons cannot access each other's data.

**Acceptance Criteria:**
- [ ] All database queries filter by organizationId
- [ ] API endpoints validate organization ownership
- [ ] Staff can only access their assigned organization
- [ ] URL structure includes organization slug
- [ ] Cross-tenant data access returns 403

---

### US-031: Real-Time Synchronization [P0]

**As a** system administrator,
**I want to** ensure all data syncs in real-time,
**So that** double-bookings are prevented.

**Acceptance Criteria:**
- [ ] Convex subscriptions used for all list views
- [ ] Slot availability updates within 100ms
- [ ] Concurrent booking attempts handled gracefully
- [ ] Optimistic locking on appointment creation
- [ ] Conflict shows user-friendly error message

---

### US-032: Audit Logging [P1]

**As a** system administrator,
**I want to** track important actions,
**So that** we can investigate issues and ensure compliance.

**Acceptance Criteria:**
- [ ] Login/logout events logged
- [ ] Appointment create/update/cancel logged
- [ ] Staff permission changes logged
- [ ] Logs include timestamp, user, action, details
- [ ] Logs retained for 90 days

---

## Story Dependency Map

```
US-001 (Salon Setup)
  └── US-002 (Services)
        └── US-003 (Staff)
              └── US-011 (Walk-in Booking)
              └── US-020-027 (Customer Booking Flow)

US-030 (Multi-Tenant) ─── Required for all features
US-031 (Real-Time) ────── Required for all booking features
```

---

## Implementation Priority

### Sprint 1 (P0 - Core)
- US-001: Salon Setup
- US-002: Service Catalog
- US-003: Staff Onboarding
- US-030: Multi-Tenant Isolation

### Sprint 2 (P0 - Booking)
- US-020: Browse Services
- US-021: Book Appointment
- US-022: View Slots
- US-023: Confirmation
- US-031: Real-Time Sync

### Sprint 3 (P0 - Operations)
- US-010: Daily Schedule
- US-011: Walk-in Booking
- US-012: Check-in
- US-014: Cancellations
- US-015: No-Show
- US-025: Customer Cancel

### Sprint 4 (P0/P1 - Dashboard)
- US-004: Dashboard
- US-006: Permissions
- US-013: Checkout
- US-024: Reminders
- US-026: Reschedule

### Sprint 5 (P1 - Enhancement)
- US-005: Reports
- US-027: Booking History
- US-032: Audit Logging

---

## Subscription & Billing Stories (P0)

### US-040: Subscribe to Platform [P0]

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

---

### US-041: Manage Subscription [P0]

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

---

### US-042: Update Payment Method [P0]

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

---

### US-043: View Billing History [P0]

**As a** salon owner,
**I want to** view my billing history,
**So that** I can track expenses and get invoices.

**Acceptance Criteria:**
- [ ] Can view list of past payments
- [ ] Each entry shows date, amount, status, billing period
- [ ] Can download invoice/receipt for each payment (PDF)
- [ ] History accessible via Polar customer portal
- [ ] Last 12 months minimum visible

---

### US-044: Handle Failed Payment [P0]

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

---

### US-045: Cancel Subscription [P0]

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

## Subscription Implementation Notes

### Sprint Allocation

| Sprint | Stories |
|--------|---------|
| Sprint 6 (P0 - Billing) | US-040, US-041, US-044 |
| Sprint 7 (P0 - Billing) | US-042, US-043, US-045 |

### Story Dependency

```
US-040 (Subscribe)
  └── US-041 (Manage)
        └── US-042 (Payment Method)
        └── US-043 (Billing History)
        └── US-044 (Failed Payment)
        └── US-045 (Cancel)
```
