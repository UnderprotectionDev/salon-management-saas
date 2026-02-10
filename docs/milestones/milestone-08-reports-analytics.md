# Milestone 8: Reports & Analytics

**Status:** ✅ Complete | **User Stories:** 5

## Goals

- Revenue report with daily breakdowns, expected revenue, and charts
- Staff performance report (appointments, revenue, utilization %)
- Customer analytics (new vs returning, retention, top customers)
- Date range picker with presets
- CSV export for all reports

## User Stories

### US-005: Revenue Report ✅
- Date range picker with presets (Today, 7d, 30d, This/Last month, Custom)
- Total Revenue + Expected Revenue + Completion Rate + Cancellation Rate cards
- Status breakdown bar (pending/confirmed/in-progress/completed/cancelled/no-show)
- Dual Y-axis AreaChart (revenue left axis, appointments right axis)
- Revenue by service table, revenue by staff table
- Period-over-period comparison (% change vs previous equal-length period)
- Only counts "completed" appointments for realized revenue
- Empty state hint messages when no completed appointments
- Export to CSV
- Files: `convex/reports.ts` (getRevenueReport), `src/modules/reports/components/RevenueReport.tsx`

### US-032: Staff Performance Report ✅
- Staff comparison table: Name, Appointments, Completed, No-shows, Revenue, Utilization %
- Utilization = (appointment minutes / scheduled minutes) × 100
- Scheduled minutes from `resolveSchedule()` (includes overrides + overtime)
- Sort by any column (Name, Appointments, Revenue, Utilization, No-shows)
- No-show rate >10% highlighted in destructive color with percentage
- Export to CSV with sanitized values
- Files: `convex/reports.ts` (getStaffPerformanceReport), `src/modules/reports/components/StaffPerformanceReport.tsx`

### US-034: Customer Analytics ✅
- Total active customers, new in period, retention rate, avg appointments per customer
- New vs Returning BarChart by month (unique customers, UTC-safe)
- Top 10 customers table (name, phone, appointments, revenue, last visit)
- Retention rate = customers with 2+ completed appointments / total unique customers
- Export to CSV with CSV injection protection
- Files: `convex/reports.ts` (getCustomerReport), `src/modules/reports/components/CustomerReport.tsx`

### US-035: Date Range Picker ✅
- Presets: Today, Last 7d, Last 30d, This month, Last month
- Custom start/end date via dual-month Calendar (react-day-picker)
- Max range: 1 year (with visible error message + disabled Apply button)
- Persists in URL query params (`?from=&to=`), defaults to last 30 days
- Syncs local state on popover open
- Files: `src/modules/reports/components/DateRangePicker.tsx`, `src/modules/reports/hooks/useDateRange.ts`

### US-036: CSV Export ✅
- Export button on each report tab
- Includes all visible columns, respects date range
- Filename: `{type}_{from}_to_{to}.csv`
- UTF-8 BOM encoding (Turkish chars ₺, ş, ç display correctly in Excel)
- Header + field escaping (commas, quotes, newlines, carriage returns)
- CSV injection sanitization for user-controlled fields (=, +, -, @)
- Files: `src/modules/reports/lib/csv.ts`, `src/modules/reports/components/ExportCsvButton.tsx`

## Implementation Details

### Backend
- `convex/reports.ts` (~350 lines) — 3 `adminQuery` functions
- Range queries via `by_org_date` index with `.gte().lte()` (single query per report)
- Batch-fetched appointment services and staff names (avoids N+1)
- UTC date parsing with `parseDateUTC()` helper
- New validators in `convex/lib/validators.ts`: `revenueReportValidator`, `staffPerformanceReportValidator`, `customerReportValidator`, `statusBreakdownValidator` + sub-validators

### Frontend
- `src/modules/reports/` — 14 files (hooks, lib, 11 components)
- Route: `src/app/[slug]/(authenticated)/reports/page.tsx` with Tabs (Revenue, Staff, Customers)
- BarChart3 icon in sidebar nav (after Customers, before Settings)
- Admin/Owner only — member role sees "Admin access required", null role shows loading skeleton
- Charts: recharts AreaChart (dual Y-axis) + BarChart via shadcn ChartContainer
- Accessibility: StatusBar segments are keyboard-focusable with ARIA meter role

### CodeRabbit Review Fixes Applied
- CSV injection protection, role check bypass fix, React key uniqueness
- Dual Y-axis for incompatible units, UTC timezone consistency
- DateRangePicker state sync, 365-day limit user feedback
- Keyboard accessibility for StatusBar segments

## Technical Notes

- Charts: recharts v2.15.4 + shadcn ChartContainer pattern
- Aggregation: in-memory (acceptable for <10k appointments/month)
- All monetary values in kuruş (÷100 for display)
- Max 366 days range enforced both UI + backend
- Reports are reactive (real-time updates via Convex subscriptions)

## Non-Goals

- Advanced BI, predictive analytics, custom report builder, email scheduling
