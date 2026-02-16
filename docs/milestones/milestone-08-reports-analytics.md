# Milestone 8: Reports & Analytics

**Status:** ✅ Complete (Enhanced Feb 2026) | **User Stories:** 6

## Goals

- Revenue report with daily breakdowns, expected revenue, and charts
- Staff performance report (appointments, revenue, utilization %)
- Customer analytics (new vs returning, retention, top customers)
- **NEW:** Customer dashboard for end-users (personal statistics)
- Date range picker with presets
- CSV export for all reports
- Enhanced visualizations (service popularity, peak hours, staff utilization charts)

## User Stories

### US-005: Revenue Report ✅ (Enhanced Feb 2026)
- Date range picker with presets (Today, 7d, 30d, This/Last month, Custom)
- Total Revenue + Expected Revenue + Completion Rate + Cancellation Rate cards
- Status breakdown bar (pending/confirmed/in-progress/completed/cancelled/no-show)
- Dual Y-axis AreaChart (revenue left axis, appointments right axis)
- **NEW:** Service Popularity Pie Chart (top 6 services by revenue with legend)
- **NEW:** Peak Hours Bar Chart (hourly appointment distribution, 08:00-20:00)
- Revenue by service table, revenue by staff table
- **Enhanced:** Expanded CSV export with 3 options (Daily Revenue, By Service, By Staff) via DropdownMenu
- Period-over-period comparison (% change vs previous equal-length period)
- Only counts "completed" appointments for realized revenue
- Empty state hint messages when no completed appointments
- Files: `convex/reports.ts` (getRevenueReport with hourlyDistribution), `src/modules/reports/components/RevenueReport.tsx`, `ServicePopularityChart.tsx`, `PeakHoursChart.tsx`

### US-032: Staff Performance Report ✅ (Enhanced Feb 2026)
- **NEW:** 4 KPI Cards (Total Appointments, Total Revenue, Avg Utilization %, Highest No-Show Rate)
- **NEW:** Staff Utilization Chart (horizontal bar chart with color-coded utilization: red <50%, yellow 50-80%, green >80%)
- Staff comparison table: Name, Appointments, Completed, No-shows, Revenue, Utilization %
- Utilization = (appointment minutes / scheduled minutes) × 100
- Scheduled minutes from `resolveSchedule()` (includes overrides + overtime)
- Sort by any column (Name, Appointments, Revenue, Utilization, No-shows)
- No-show rate >10% highlighted in destructive color with percentage
- Export to CSV with sanitized values
- Files: `convex/reports.ts` (getStaffPerformanceReport), `src/modules/reports/components/StaffPerformanceReport.tsx`, `StaffUtilizationChart.tsx`

### US-034: Customer Analytics ✅ (Enhanced Feb 2026)
- **Enhanced:** KPI cards now show trend indicators (↑ up, ↓ down, → neutral) comparing to previous period
- Total active customers, new in period, retention rate, avg appointments per customer
- **Fixed:** Retention rate calculation now uses historical data for previous period (was using current period data)
- New vs Returning BarChart by month (unique customers, UTC-safe)
- Top 10 customers table (name, phone, appointments, revenue, last visit)
- Retention rate = customers with 2+ completed appointments / total unique customers
- Export to CSV with CSV injection protection
- Files: `convex/reports.ts` (getCustomerReport with comparison indicators), `src/modules/reports/components/CustomerReport.tsx`

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

### US-037: Customer Dashboard (Personal Statistics) ✅ **NEW Feb 2026**
- **Audience:** End-users (non-staff customers) to view their personal visit and spending statistics
- **Route:** `/dashboard/stats` (accessible from main dashboard via "My Stats" button)
- **4 KPI Cards:** Total Visits, This Month (with trend vs last month), Total Spent, Monthly Average
- **Spending Trend Chart:** Dual Y-axis area chart (spending left, visits right) for last 12 months
- **Favorite Services Table:** Top 5 most booked services with visit count and total spent
- **Recent Visits Timeline:** Last 10 completed appointments with salon name, date, services, and amount
- **Salons Breakdown:** Visit and spending stats per salon (clickable to book again)
- **Empty State:** "No visits yet" message with "Find a Salon" CTA button
- **Data Source:** Only completed appointments across all salons user has visited
- **Access Control:** Uses `authedQuery` (any logged-in user can see their own stats)
- Files: `convex/customerDashboard.ts` (getCustomerDashboard - 272 lines), `src/app/dashboard/stats/page.tsx` (630 lines), `src/app/dashboard/page.tsx` (added "My Stats" button)

## Implementation Details

### Backend
- `convex/reports.ts` (~770 lines, +420 from enhancements) — 3 `orgQuery` functions (`getRevenueReport`, `getStaffPerformanceReport`, `getCustomerReport`)
- **NEW:** `convex/customerDashboard.ts` (272 lines) — 1 `authedQuery` function for personal customer statistics
- **Enhanced Security:** Staff without `ctx.staff` records now throw `FORBIDDEN` errors (prevents unauthorized data access)
- Access control: Owner sees all data, staff members see filtered data (own appointments/stats only via `staffFilter`)
- Range queries via `by_org_date` index with `.gte().lte()` (single query per report)
- **Fixed:** Retention rate calculation now uses historical customer stats (previous bug used current period data)
- **New Features:** Hourly appointment distribution, service popularity aggregation, comparison indicators
- Batch-fetched appointment services and staff names with `Promise.all` (parallelized indexed queries)
- UTC date parsing with `parseDateUTC()` helper + **new** regex validation `/^\d{4}-\d{2}-\d{2}$/`
- New validators in `convex/lib/validators.ts`: `revenueReportValidator`, `staffPerformanceReportValidator`, `customerReportValidator`, `statusBreakdownValidator`, `hourlyDistributionValidator` + sub-validators
- **Debug Tool:** `convex/testCustomerDashboard.ts` for troubleshooting customer dashboard data

### Frontend
- `src/modules/reports/` — **17 files** (hooks, lib, 14 components including 3 new charts)
- **NEW Components:** `ServicePopularityChart.tsx` (Pie), `PeakHoursChart.tsx` (Bar), `StaffUtilizationChart.tsx` (Horizontal Bar)
- **NEW Route:** `src/app/dashboard/stats/page.tsx` (630 lines) — Customer personal statistics dashboard
- Route: `src/app/[slug]/(authenticated)/reports/page.tsx` with Tabs (Revenue, Staff, Customers)
- BarChart3 icon in sidebar nav (after Customers, before Settings)
- **Enhanced:** Revenue report now uses DropdownMenu for 3 CSV export options
- **Locale:** All date/time formatting changed from `tr-TR` to `en-US` (dates like "Feb 16, 2024")
- **Error Handling:** Removed dead `hasError` checks (Convex queries don't return null, they throw)
- Access: Both owner and staff can access. Staff members see filtered data (their own appointments/performance only)
- Charts: recharts AreaChart (dual Y-axis) + BarChart + PieChart via shadcn ChartContainer
- Accessibility: StatusBar segments are keyboard-focusable with ARIA meter role

### CodeRabbit Review Fixes Applied
- CSV injection protection, role check bypass fix, React key uniqueness
- Dual Y-axis for incompatible units, UTC timezone consistency
- DateRangePicker state sync, 365-day limit user feedback
- Keyboard accessibility for StatusBar segments

### Feb 2026 Enhancements & Bug Fixes
**Critical Bugs Fixed:**
- **Retention rate calculation** — Now uses historical customer data up to previous period end (was incorrectly using current period stats)
- **Dead error handling** — Removed `report === null` checks (Convex queries throw exceptions, never return null)
- **Staff security** — Staff without `ctx.staff` records now get `FORBIDDEN` errors (prevents unauthorized data leaks)

**Performance Improvements:**
- Appointment services fetched with parallelized indexed queries (`Promise.all`)
- Added date format validation regex to prevent invalid date strings

**New Features:**
- Service popularity pie chart with top 6 services
- Peak hours bar chart showing hourly appointment distribution (08:00-20:00)
- Staff utilization horizontal bar chart with color-coded performance indicators
- 4 KPI cards on staff performance report
- Customer report trend indicators (up/down/neutral vs previous period)
- Expanded CSV export options (Daily, By Service, By Staff) via dropdown menu
- Complete customer dashboard for end-users (`/dashboard/stats`)

**Locale Changes:**
- All date/time formatting converted from Turkish (`tr-TR`) to English (`en-US`)
- Dates now display as "Feb 16, 2024" instead of "16 Şub 2024"

## Technical Notes

- Charts: recharts v2.15.4 + shadcn ChartContainer pattern (AreaChart, BarChart, PieChart)
- Aggregation: in-memory (acceptable for <10k appointments/month)
- All monetary values in kuruş (÷100 for display)
- Max 366 days range enforced both UI + backend
- Reports are reactive (real-time updates via Convex subscriptions)
- **Customer Dashboard:** Aggregates data across all salons user has visited (cross-organization)
- **Historical Data:** Retention rate fix requires fetching all historical appointments (uses "2020-01-01" as far-past date)
- **Locale:** English (`en-US`) for consistency with international standards

## Files Modified/Created (Feb 2026 Enhancement)

**Backend (Convex):**
- `convex/reports.ts` — Bug fixes, hourly distribution, comparison indicators (+420 lines)
- `convex/customerDashboard.ts` — **NEW** Customer statistics query (272 lines)
- `convex/lib/validators.ts` — Added `hourlyDistributionValidator`, updated report validators
- `convex/testCustomerDashboard.ts` — **NEW** Debug script for troubleshooting (95 lines)

**Frontend (React):**
- `src/app/dashboard/stats/page.tsx` — **NEW** Customer dashboard (630 lines)
- `src/app/dashboard/page.tsx` — Added "My Stats" button (BarChart3 icon)
- `src/modules/reports/components/RevenueReport.tsx` — CSV expansion, 2 new charts, error fix
- `src/modules/reports/components/StaffPerformanceReport.tsx` — KPI cards, utilization chart, error fix
- `src/modules/reports/components/CustomerReport.tsx` — Comparison indicators, error fix
- `src/modules/reports/components/ServicePopularityChart.tsx` — **NEW** Pie chart (85 lines)
- `src/modules/reports/components/PeakHoursChart.tsx` — **NEW** Bar chart (70 lines)
- `src/modules/reports/components/StaffUtilizationChart.tsx` — **NEW** Horizontal bar chart (95 lines)
- 4 chart components — Locale changed from `tr-TR` to `en-US`

**Total:** 4 new files, 11 modified files, ~1,700 lines of code added

## Non-Goals

- Advanced BI, predictive analytics, custom report builder, email scheduling
- Real-time dashboard (reports update on data change, but not live-streaming)
- Data export to external BI tools (Tableau, Power BI, etc.)
- Scheduled report emails or automated alerts
- Custom date grouping (daily/weekly/quarterly beyond monthly)

## Future Enhancements (Potential)

- **Revenue Forecasting:** ML-based predictions for next month's revenue
- **Customer Segmentation:** RFM analysis (Recency, Frequency, Monetary)
- **Appointment Heatmap:** Visual calendar showing busy/slow periods
- **Service Recommendations:** Suggest services to customers based on history
- **Staff Commission Tracking:** Automated commission calculations
- **Multi-currency Support:** For salons operating internationally
- **PDF Export:** Professional-looking PDF reports with charts
- **Dashboard Widgets:** Customizable dashboard with drag-and-drop widgets
