# Milestone 12: Financial Management

**Status:** ✅ Complete | **User Stories:** US-F01~US-F12

## Summary

Owner-only financial management module with expense tracking, additional revenue recording, gift card management, daily cash reconciliation, staff commission configuration/reporting, and P/L dashboard. Spreadsheet-like inline editing experience with auto-save.

## What Was Built

- **Expense Tracking:** Full CRUD with 13 categories, payment methods, recurring expense support, bulk delete, closed-day protection
- **Additional Revenue:** Track non-appointment income (product sales, tips, gift card sales, other) with inline editing
- **Gift Cards:** Issue with auto-generated 8-char codes, track balance, redeem, auto-expire via cron
- **Daily Closing:** Auto-computed revenue breakdown by payment method, manual cash count entry, variance calculation, day locking
- **Commission Settings:** Per-staff fixed rate or tiered model configuration
- **Commission Reports:** Computed payouts from completed appointments in date range
- **Financial Dashboard:** 6 KPI cards (total revenue, expenses, net P/L, profit margin, daily avg, cash flow) + monthly bar chart
- **CSV Export:** Expense and revenue data export with UTF-8 BOM support

## User Stories

| ID     | Title                                | Type           |
| ------ | ------------------------------------ | -------------- |
| US-F01 | Expense CRUD                         | Full-Stack     |
| US-F02 | Expense Categories (13 types)        | Backend        |
| US-F03 | Recurring Expense Auto-Generation    | Backend (cron) |
| US-F04 | Additional Revenue CRUD              | Full-Stack     |
| US-F05 | Gift Card Management                 | Full-Stack     |
| US-F06 | Gift Card Redemption                 | Full-Stack     |
| US-F07 | Gift Card Expiry (cron)              | Backend        |
| US-F08 | Daily Closing / Cash Reconciliation  | Full-Stack     |
| US-F09 | Commission Settings (fixed/tiered)   | Full-Stack     |
| US-F10 | Commission Report                    | Full-Stack     |
| US-F11 | Financial Dashboard (6 KPIs + chart) | Full-Stack     |
| US-F12 | CSV Export (expenses + revenue)      | Frontend       |

## Schema Changes

5 new tables:

- `expenses` — with indexes: by_org_date, by_org_category, by_org_approval, by_org_recurrence
- `additionalRevenue` — with indexes: by_org_date, by_org_type, by_org_staff
- `giftCards` — with indexes: by_org, by_org_code, by_org_status
- `dailyClosing` — with indexes: by_org_date, by_org_closed
- `commissionSettings` — with indexes: by_org, by_org_staff

## Key Files

### Backend (Convex)

- `convex/expenses.ts` — list, get, create, update, remove, bulkDelete, generateRecurring
- `convex/additionalRevenue.ts` — list, create, update, remove
- `convex/giftCards.ts` — list, get, create, update, redeem, expireOld
- `convex/dailyClosing.ts` — getForDate, list, updateCashCount, closeDay
- `convex/commissionSettings.ts` — listByOrg, getForStaff, upsert
- `convex/financials.ts` — getDashboardStats, getCommissionReport
- `convex/crons.ts` — 2 new daily crons (recurring expenses, gift card expiry)
- `convex/lib/rateLimits.ts` — 4 new limits (createExpense, createAdditionalRevenue, createGiftCard, closeDay)
- `convex/lib/validators.ts` — ~60 lines of new validators

### Frontend

- `src/app/[slug]/(authenticated)/financials/page.tsx` — Main page with tabs
- `src/modules/financials/` — Module with 7 components, 1 hook, 3 lib files
- `src/app/[slug]/(authenticated)/layout.tsx` — Wallet sidebar item

## Key Decisions

1. **Owner-only access** — Staff see "Owner access required" message
2. **Closed-day immutability** — Once a day is closed, expenses/revenue cannot be modified
3. **Client-side debounce** — 1500ms sliding window for auto-save (no server-side debouncer needed)
4. **Kuruş integers** — All amounts in kuruş (100 = ₺1.00), consistent with rest of app
5. **Virtual daily closing** — `getForDate` computes data live until day is formally closed
6. **8-char gift card codes** — Alphanumeric, excludes ambiguous chars (0/O/I/1)
7. **Recurring expenses** — Templates generate one_time entries via daily cron, linked via recurringParentId

## Constraints

- Day closing is irreversible
- Gift cards cannot be redeemed if expired or fully used
- Commissions are read-only computed values (no manual override)
- Expense amount must be > 0
- All financial queries use ownerQuery/ownerMutation wrappers
