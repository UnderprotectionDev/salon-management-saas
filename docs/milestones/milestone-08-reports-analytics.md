# Milestone 8: Reports & Analytics

**Status:** Pending | **User Stories:** 5

## Goals

- Revenue report with daily/weekly/monthly breakdowns and charts
- Staff performance report (appointments, revenue, utilization %)
- Customer analytics (new vs returning, retention, top customers)
- Date range picker with presets
- CSV export for all reports

## User Stories

### US-005: Revenue Report
- Date range picker, total revenue card
- Revenue trend chart (line, by day/week/month)
- Revenue by service table, revenue by staff table
- Period comparison (% change)
- Only counts "completed" appointments
- Export to CSV
- Files: `convex/reports.ts`, `src/app/[slug]/reports/revenue/page.tsx`

### US-032: Staff Performance Report
- Staff comparison table: Name, Appointments, Completed, No-shows, Revenue, Utilization %
- Utilization = (appointment hours / scheduled hours) × 100
- Scheduled hours from `staff.defaultSchedule`, fallback to org business hours
- Sort by any column, no-show rate highlight if >10%
- Export to CSV
- Files: `src/app/[slug]/reports/staff/page.tsx`

### US-034: Customer Analytics
- Total active customers, new vs returning chart (bar by month)
- Top customers table (name, appointments, spent, last visit)
- Retention rate = customers with 2+ appointments / total
- Average appointments per customer
- Export to CSV
- Files: `src/app/[slug]/reports/customers/page.tsx`

### US-035: Date Range Picker
- Presets: Today, Last 7d, Last 30d, This month, Last month, Custom
- Custom start/end date selection
- Max range: 1 year
- Persists in URL query params (`?from=&to=`)
- Files: `src/components/DateRangePicker.tsx`

### US-036: CSV Export
- Export button on each report page
- Includes all visible columns, respects date range
- Filename: `{type}_{from}_to_{to}.csv`
- UTF-8 encoding (Turkish chars)
- Files: `convex/exports.ts`, `src/components/ExportButton.tsx`

## Technical Notes

- Charts: `recharts` or shadcn/ui charts
- Aggregation: in-memory (acceptable for <10k appointments/month)
- All monetary values in ₺
- Only completed appointments for revenue
- Dates in org timezone

## Non-Goals

- Advanced BI, predictive analytics, custom report builder, email scheduling
