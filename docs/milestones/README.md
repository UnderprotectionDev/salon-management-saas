# Milestones

## Overview

| # | Name | Status | User Stories |
|---|------|--------|-------------|
| 1 | Multi-Tenant Foundation | ✅ Complete | 13 |
| 2 | Services, Staff & Customers | ✅ Complete | 4 |
| 3 | Booking Engine Core | ✅ Complete | 4 |
| 4 | Booking Operations | ✅ Complete | 5 |
| 5 | Dashboard & Calendar | ✅ Complete | 4 |
| 6 | SaaS Billing (Polar.sh) | ✅ Complete | 5 |
| 7 | Email Notifications (Resend) | ✅ Complete | 5 |
| 8 | Reports & Analytics | ✅ Complete | 5 |
| 9 | Customer Portal | 📋 Pending | 5 |
| 10 | AI Features | 📋 Pending | 8 |

## Quality Gates

**Backend:** `bunx convex dev` (types), `bun run lint` (filter `_generated/`), custom wrappers, `returns:` validators
**Frontend:** `bun run lint`, `bun run build`, TanStack Form + Zod
**Full-stack:** All above + end-to-end verification
