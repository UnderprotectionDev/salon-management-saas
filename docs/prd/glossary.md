# Glossary

## Organization / Salon / Tenant

| Context | Term | Examples |
|---------|------|----------|
| Code & Database | `organization` | `organizationId`, `organization.slug` |
| User Interface | `salon` | "Select your salon", "Salon settings" |
| Architecture | `tenant` | "Tenant isolation", "Per-tenant data" |

## Business Terms

| Term | Definition |
|------|-----------|
| Appointment | Scheduled booking with status: pending → confirmed → checked_in → in_progress → completed / cancelled / no_show |
| Check-in | Marking customer as arrived, triggers staff notification |
| Confirmation Code | 6-char alphanumeric (excludes 0/O/I/1), unique per org |
| Customer | Individual who books services, may or may not have account |
| No-Show | Customer fails to appear, recorded informational only (no penalty) |
| Service | Salon offering with name, duration, price, eligible staff |
| Service Category | Grouping of related services (Hair, Nails, Makeup) |
| Staff | Employee with membership role (via `member` table) and profile (via `staff` table) |
| Walk-in | Customer arriving without appointment |
| Slot Lock | 2-min temporary reservation preventing double-booking |

## Status Definitions

**Appointment:** pending → confirmed → checked_in → in_progress → completed (terminal) | cancelled (terminal) | no_show (terminal)

**Staff:** active | inactive | pending

**Service:** active | inactive (soft-delete)

**Member Roles:** owner (1 per org, full access) | staff (own schedule only)

**Subscription:** trialing | active | past_due | canceled | unpaid | suspended | pending_payment

**SuperAdmin:** Platform administrator with environment-based access (`SUPER_ADMIN_EMAILS`)

## Time Conventions

- **Storage:** ISO date `"2024-03-15"`, minutes from midnight (870 = 14:30)
- **Schedule times:** String `"14:30"` (business hours, staff schedule)
- **Timezone:** `Europe/Istanbul` (stored as string, handles DST)
- **Duration:** Minutes, 15-min slot increments
- **Pricing:** Kuruş integers (15000 = ₺150.00)
- **Phone:** Turkish format +90 5XX XXX XX XX

## Abbreviations

| Abbr | Full |
|------|------|
| KVKK | Kişisel Verilerin Korunması Kanunu (Turkish GDPR) |
| MRR | Monthly Recurring Revenue |
| RBAC | Role-Based Access Control |
| RLS | Row-Level Security |
| TTL | Time To Live |
