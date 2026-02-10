# Milestone 9: Dashboard Appointment Management

**Status:** Complete | **User Stories:** 5

## Goals

- Appointment history (active + past) on `/dashboard`
- Self-service rescheduling with slot selection
- Self-service cancellation (2-hour policy)
- "Book again" for repeat visits
- Customer profile management across salons

## Implementation

Customer self-service features (cancel, reschedule, book again, profile editing) are built directly into the `/dashboard` page alongside appointment history.

### Backend Functions

| Function | Type | Description |
|----------|------|-------------|
| `appointments.getForUser` | authedQuery | Get appointment detail with IDs for actions |
| `appointments.cancelByUser` | authedMutation | Cancel with 2-hour policy |
| `appointments.rescheduleByUser` | authedMutation | Reschedule with slot lock validation |
| `customers.getMyProfiles` | authedQuery | Cross-org customer profiles |
| `customers.updateMyProfile` | authedMutation | Edit name/phone/email |

### Dashboard Components (all inline in `src/app/dashboard/page.tsx`)

- `AppointmentCard` — Rich card with date, time, staff, services, actions
- `UserCancelDialog` — Cancel confirmation with optional reason
- `UserRescheduleDialog` — Date picker + time slot grid
- `BookAgainButton` — Link to booking with pre-filled services/staff
- `ProfileCard` — Inline edit for customer profile
- `ProfilesSection` — Lists all salon profiles

### Key Behaviors

- 2-hour cancellation/reschedule policy enforced client-side (`canModifyAppointment`) and server-side
- `getForUser` only fetched when appointment is actionable (active or completed)
- Book Again uses `/{slug}/book?services=...&staff=...` URL params
- Profile identity via `customer.userId` — no phone verification needed

## Non-Goals

- Reviews/ratings, loyalty program, payment storage, 2FA, family accounts
