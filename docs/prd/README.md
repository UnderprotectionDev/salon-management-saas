# Salon Management SaaS - PRD

> **Current Milestone:** 6 - SaaS Billing (Polar.sh)

## Quick Navigation

| Document | Purpose |
|----------|---------|
| [Product Overview](./product-overview.md) | Vision, personas, business model |
| [Database Schema](./database-schema.md) | Convex schema, tables, indexes |
| [API Reference](./api-reference.md) | Function signatures, rate limits |
| [System Architecture](./system-architecture.md) | Tech stack, multi-tenancy, project structure |
| [Features](./features.md) | Feature specs and business rules |
| [Design System](./design-system.md) | UI components, colors, typography |
| [Glossary](./glossary.md) | Domain terminology |
| [Future Enhancements](./future-enhancements.md) | Post-MVP ideas |

## Tech Stack

Frontend: Next.js 16, React 19 + Compiler, Tailwind CSS v4, shadcn/ui, TanStack Form + Zod
Backend: Convex (DB, functions, real-time), convex-helpers, Better Auth
Payments: Polar.sh (planned) | Tools: Bun, Biome

## Milestone Status

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Multi-Tenant Foundation | ✅ Complete |
| 2 | Services, Staff & Customers | ✅ Complete |
| 3 | Booking Engine Core | ✅ Complete |
| 4 | Booking Operations | ✅ Complete |
| 5 | Dashboard & Calendar | ✅ Complete |
| 6 | SaaS Billing | 📋 Next |
| 7 | Email Notifications | 📋 Planned |
| 8 | Reports & Analytics | 📋 Planned |
| 9 | Customer Portal | 📋 Planned |

See [Milestones](../milestones/README.md) for details.

## Priority Map

- **P0 (MVP):** Multi-tenant ✅, Services ✅, Staff ✅, Customers ✅, Booking ✅, Dashboard ✅, Billing 📋
- **P1:** Email notifications, Reports, Analytics
- **P2:** Customer portal, Products & inventory
