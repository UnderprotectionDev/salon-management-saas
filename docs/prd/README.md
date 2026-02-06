# Salon Management SaaS - Product Requirements Document

> **Version:** 1.2.0
> **Last Updated:** 2026-02-06
> **Status:** Active Development (Sprint 1.5 🔄 In Progress)

## Executive Overview

A modern, cloud-based salon management platform designed for Turkish beauty salons. The system enables online appointment booking, staff schedule management, customer relationship tracking, and business analytics through a real-time, multi-tenant architecture.

### Key Value Propositions

- **For Salon Owners:** Streamlined operations, reduced no-shows, actionable business insights
- **For Staff:** Efficient schedule management, clear daily workflow
- **For Customers:** 24/7 online booking, appointment reminders, seamless experience

---

## Quick Navigation

| Document                                          | Description                              |
| ------------------------------------------------- | ---------------------------------------- |
| [01 - Product Overview](./01-product-overview.md) | Vision, goals, personas, success metrics |
| [02 - User Stories](./02-user-stories.md)         | Complete user stories by persona         |

### Feature Specifications

| Document                                                    | Priority | Description                                       |
| ----------------------------------------------------------- | -------- | ------------------------------------------------- |
| [Core Booking](./03-features/core-booking.md)               | P0       | Appointment engine, slot management, booking flow |
| [Staff Management](./03-features/staff-management.md)       | P0       | Staff profiles, schedules, shifts                 |
| [Customer Portal](./03-features/customer-portal.md)         | P1       | Customer-facing booking & account                 |
| [Admin Dashboard](./03-features/admin-dashboard.md)         | P0       | Business owner panel & analytics                  |
| [Products & Inventory](./03-features/products-inventory.md) | P1       | Product showcase & stock management               |

### Technical Documentation

| Document                                           | Description                               |
| -------------------------------------------------- | ----------------------------------------- |
| [Architecture](./04-technical/architecture.md)     | System design, tech stack, infrastructure |
| [Convex Schema](./04-technical/convex-schema.md)   | Database schema with complete examples    |
| [API Contracts](./04-technical/api-contracts.md)   | Function signatures & TypeScript types    |
| [File Hierarchy](./04-technical/file-hierarchy.md) | Project structure & organization          |
| [Security](./04-technical/security.md)             | Security requirements & compliance        |

### UX/UI Guidelines

| Document                                     | Description                     |
| -------------------------------------------- | ------------------------------- |
| [Design System](./05-ux-ui/design-system.md) | UI tokens, components, patterns |
| [User Flows](./05-ux-ui/user-flows.md)       | Flow diagrams (Mermaid)         |

### Implementation

| Document                                                 | Description                       |
| -------------------------------------------------------- | --------------------------------- |
| [Implementation Roadmap](./06-implementation-roadmap.md) | Sprint-based MVP development plan |

### Appendix

| Document                                       | Description                      |
| ---------------------------------------------- | -------------------------------- |
| [Glossary](./appendix/glossary.md)             | Domain terminology & definitions |
| [Edge Cases](./appendix/edge-cases.md)         | Edge cases & error handling      |
| [Future Roadmap](./appendix/future-roadmap.md) | V2+ features & roadmap           |

---

## Priority Classification

| Priority | Definition       | Target Release |
| -------- | ---------------- | -------------- |
| **P0**   | MVP Must-Have    | v1.0           |
| **P1**   | MVP Nice-to-Have | v1.0           |
| **P2**   | Post-MVP         | v1.1           |
| **P3**   | Future           | v2.0+          |

### P0 Features (MVP Must-Have)

- Authentication & Authorization (Better Auth)
- Multi-tenant Organization Setup
- Service Catalog Management
- Staff Profile & Schedule Management
- Appointment Booking Engine
- Basic Admin Dashboard
- SaaS Subscription Billing (Polar.sh)

### P1 Features (MVP Nice-to-Have)

- Products & Inventory Management
- Customer Self-Service Portal
- Basic Reports & Analytics
- Email Notifications (Resend)

### P2 Features (Post-MVP)

- SMS Notifications
- WhatsApp Integration
- Waitlist Management
- Recurring Appointments

### P3 Features (Future)

- Customer Payment Processing (Deposits/Prepayments)
- Multi-location Support
- AI-powered Recommendations
- Advanced Analytics & BI

---

## Tech Stack Summary

| Layer           | Technology                                        |
| --------------- | ------------------------------------------------- |
| Frontend        | Next.js 16 (App Router), React 19, React Compiler |
| UI Components   | shadcn/ui (New York style), Tailwind CSS v4       |
| Backend         | Convex (database, functions, real-time)           |
| Authentication  | Better Auth with Convex adapter                   |
| Payments        | Polar.sh (@convex-dev/polar, @polar-sh/sdk)       |
| Email           | Resend + React Email                              |
| Monitoring      | Sentry                                            |
| Package Manager | Bun                                               |
| Code Quality    | Biome                                             |

---

## Localization

| Aspect      | Configuration                                      |
| ----------- | -------------------------------------------------- |
| UI Language | English (default)                                  |
| Currency    | Turkish Lira (TRY) - ₺                             |
| Timezone    | Europe/Istanbul (default, configurable per tenant) |
| Date Format | DD.MM.YYYY                                         |
| Time Format | 24-hour (HH:mm)                                    |
| i18n Ready  | Yes - Turkish support planned for v1.1             |

---

## Document Conventions

### Requirement IDs

- **FR-XXX:** Functional Requirement
- **NFR-XXX:** Non-Functional Requirement
- **US-XXX:** User Story
- **TC-XXX:** Test Case

### Status Indicators

- `[P0]` `[P1]` `[P2]` `[P3]` - Priority levels
- `[MVP]` - Included in MVP
- `[FUTURE]` - Post-MVP feature
- `[DEPRECATED]` - No longer planned

### Code Examples

All code examples use TypeScript and follow the project's conventions:

- Convex functions with complete type definitions
- React components with proper typing
- API contracts with input/output schemas

---

## Current Progress

| Sprint                                 | Status         | Completion Date |
| -------------------------------------- | -------------- | --------------- |
| Pre-Sprint (Auth, UI)                  | ✅ Done        | 2026-02-04      |
| Sprint 1 (Multi-Tenant)                | ✅ Done        | 2026-02-05      |
| Sprint 1.5 (Multi-Tenant Enhancements) | 🔄 In Progress | -               |
| Sprint 2 (Services, Staff, Customers)  | 📋 Next        | -               |

### Sprint 1 Deliverables

- ✅ Database schema (organization, member, invitation, staff, organizationSettings)
- ✅ Onboarding wizard with auto-redirect
- ✅ Business hours editor (Settings page)
- ✅ Staff invitation system (separate invitation table with full lifecycle)
- ✅ Organization switcher
- ✅ Protected routes & custom function wrappers (RLS)
- ✅ UI standardization (English)
- ✅ Rate limiting infrastructure
- ✅ Return validators (convex/lib/validators.ts)

### Sprint 1.5 Deliverables (In Progress)

- ✅ Staff profile detail page & edit form
- ✅ Staff schedule editor
- ✅ File storage / logo upload
- ✅ Audit logging infrastructure
- ✅ Members & invitations management (backend)
- ✅ Ownership transfer
- 🔄 Settings sub-forms (address, contact, general info)
- 🔄 Members management UI
