[PRD]
# Sprint 8: Reports & Analytics

## Overview

Sprint 8 builds the reporting and analytics system for business insights. Includes revenue reports, staff performance analysis, customer analytics, date range filtering, and CSV export functionality.

**Problem Statement:** Salon owners need detailed reports to track business performance, staff productivity, and customer behavior over time.

**Solution:** Comprehensive reporting dashboard with revenue, staff, and customer analytics, date range filtering, visualization charts, and CSV export for external analysis.

## Goals

- Create revenue report with daily/weekly/monthly breakdowns
- Build staff performance report (appointments, revenue, utilization)
- Build customer analytics report (new vs returning, retention)
- Implement date range picker for all reports
- Add CSV export functionality
- Visualize data with charts (revenue trends, staff comparison)

## Quality Gates

**Backend Stories (Convex):**
- `bunx convex dev` - Type generation
- `bun run lint` - Biome linting
- All queries optimized with proper indexes
- All functions have `returns:` validators
- Report queries handle large datasets (1000+ appointments)

**Frontend Stories (React/Next.js):**
- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual testing: Reports load in <2 seconds
- Charts render correctly with real data

**Full-Stack Stories:**
- All backend + frontend quality gates
- Date range filtering works correctly
- CSV export downloads valid file
- All reports show accurate calculations

## Dependencies

**Requires completed:**
- Sprint 4: Booking Operations (completed appointments for revenue)
- Sprint 2: Services, Staff, Customers (entities for analytics)

**Provides foundation for:**
- Future advanced BI features (v2.0)

## User Stories

### US-005: Revenue Report

**Description:** As a salon owner, I want to view revenue reports by date range, service, and staff, so that I can track business income.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Revenue report page with date range picker
- [ ] Total revenue card shows sum for selected period
- [ ] Revenue trend chart (line chart by day/week/month)
- [ ] Revenue by service table (service name, count, total revenue)
- [ ] Revenue by staff table (staff name, appointments, total revenue)
- [ ] Comparison to previous period (percentage change)
- [ ] Only counts "completed" appointments
- [ ] Export to CSV button

**Technical Notes:**
- Files to create:
  - `convex/reports.ts` - Revenue query with aggregations
  - `src/app/[slug]/reports/revenue/page.tsx` - Revenue report page
  - `src/modules/reports/components/RevenueChart.tsx`
  - `src/modules/reports/components/RevenueByService.tsx`
  - `src/modules/reports/components/RevenueByStaff.tsx`
- Query aggregation:
  - Group by date (day/week/month)
  - Sum `appointmentServices.price` for completed appointments
- Use `recharts` or `shadcn/ui charts` for visualization
- Use `orgQuery` with date range parameters

### US-032: Staff Performance Report

**Description:** As a salon owner, I want to view staff performance metrics, so that I can identify top performers and areas for improvement.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Staff performance page with date range picker
- [ ] Staff comparison table: Name, Total appointments, Completed, No-shows, Revenue, Utilization %
- [ ] Utilization % = (actual hours worked / scheduled hours) * 100
  - **Definition:** "Scheduled hours" refers to the staff member's `defaultSchedule` working hours from the `staff` table, calculated across the selected date range
  - **Calculation:** Sum all hours from `defaultSchedule` entries that fall within the report's date range
  - **Fallback:** If `defaultSchedule` is empty or undefined, use organization's business hours (`organizationSettings.businessHours`) as the baseline
  - **Edge case:** If scheduled hours = 0, display "N/A" instead of attempting division
- [ ] Sort by any column (appointments, revenue, utilization)
- [ ] Staff detail view shows appointment breakdown by service
- [ ] No-show rate highlighted if >10%
- [ ] Export to CSV button

**Technical Notes:**
- Files to create:
  - `convex/reports.ts` - Add `staffPerformance` query
  - `src/app/[slug]/reports/staff/page.tsx` - Staff performance page
  - `src/modules/reports/components/StaffComparisonTable.tsx`
- Calculations:
  - Total appointments: Count by staffId
  - Completed: Count where status = "completed"
  - No-shows: Count where status = "no_show"
  - Revenue: Sum of completed appointment prices
  - Utilization: (sum of appointment durations) / (scheduled hours * 60)
- Use `shadcn/ui Table` with sorting

### US-034: Customer Analytics

**Description:** As a salon owner, I want to view customer analytics, so that I can understand customer retention and behavior.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Customer analytics page with date range picker
- [ ] Total customers card (active customers with appointments)
- [ ] New vs returning customers chart (bar chart by month)
- [ ] Top customers table (name, total appointments, total spent, last visit)
- [ ] Customer retention rate (customers with 2+ appointments in period)
- [ ] Average appointments per customer
- [ ] Export to CSV button

**Technical Notes:**
- Files to create:
  - `convex/reports.ts` - Add `customerAnalytics` query
  - `src/app/[slug]/reports/customers/page.tsx` - Customer analytics page
  - `src/modules/reports/components/NewVsReturning.tsx`
  - `src/modules/reports/components/TopCustomers.tsx`
- Calculations:
  - New customer: First appointment in date range
  - Returning: Had appointment before date range start
  - Retention rate: (customers with 2+ appointments) / (total customers)
- Top customers: Sort by total spent (descending)

### US-035: Date Range Picker

**Description:** As a salon owner, I want to select custom date ranges for all reports, so that I can analyze specific time periods.

**Complexity:** Low

**Type:** Frontend

**Acceptance Criteria:**
- [ ] Date range picker component with presets (Today, Last 7 days, Last 30 days, This month, Last month, Custom)
- [ ] Custom range allows selecting start and end dates
- [ ] Selected range is displayed in human-readable format
- [ ] Changing range triggers report refresh
- [ ] Max range is 1 year (performance limit)
- [ ] Date range persists in URL query params

**Technical Notes:**
- Files to create:
  - `src/components/DateRangePicker.tsx` - Reusable component
- Use `shadcn/ui Calendar` + `Popover`
- URL params: `?from=2024-01-01&to=2024-01-31`
- Use `date-fns` for date manipulation

### US-036: CSV Export

**Description:** As a salon owner, I want to export report data to CSV, so that I can analyze it in Excel or Google Sheets.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Export button on each report page
- [ ] CSV includes all visible columns from current view
- [ ] CSV respects current date range filter
- [ ] Filename includes report type and date range (e.g., `revenue_2024-01-01_to_2024-01-31.csv`)
- [ ] CSV downloads immediately (browser download)
- [ ] CSV uses UTF-8 encoding (Turkish character support)

**Technical Notes:**
- Files to create:
  - `convex/exports.ts` - CSV generation action
  - `src/components/ExportButton.tsx` - Export trigger
- Libraries: `papaparse` for CSV generation
- Server-side CSV generation (Convex action)
- Return CSV as blob, trigger browser download

## Functional Requirements

- FR-8.1: Reports only include "completed" appointments for revenue calculations
- FR-8.2: Date range picker max range is 1 year
- FR-8.3: Utilization % is calculated as (appointment hours / scheduled hours) * 100
- FR-8.4: Retention rate counts customers with 2+ appointments in period
- FR-8.5: CSV export respects organization timezone for date display
- FR-8.6: All monetary values are displayed in Turkish Lira (₺)

## Non-Goals (Out of Scope)

- Advanced BI dashboards (Tableau-like) - v2.0
- Real-time analytics (reports are near-real-time, not live)
- Predictive analytics (AI-powered forecasting) - v2.0
- Custom report builder - Predefined reports only for MVP
- Email report scheduling (daily/weekly digest) - Post-MVP
- Multi-location comparison - v2.0
- Goal setting and tracking - Post-MVP

## Technical Considerations

### Performance
- Report queries can be expensive (aggregations across large datasets)
- Add composite indexes: `appointments.by_organization_status_date`
- Consider caching for frequently accessed reports (1-hour TTL)
- Paginate top customers table (show top 50)

### Aggregation Strategy
- Use Convex queries with in-memory aggregation (acceptable for <10k appointments/month)
- For larger datasets (future), consider pre-aggregated tables (daily rollups)

### Date Range Handling
- All date comparisons use organization timezone
- Convert user-selected dates to UTC for database queries
- Display results in organization's local timezone

### CSV Generation
- Server-side generation prevents client-side performance issues
- Max CSV size: 10MB (approximately 50k rows)
- For larger exports, use streaming CSV generation (post-MVP)

## Success Metrics

- [ ] Revenue report loads in <2 seconds (with 1000 appointments)
- [ ] Staff performance report loads in <2 seconds
- [ ] Customer analytics loads in <2 seconds
- [ ] CSV export completes in <5 seconds
- [ ] All calculations are mathematically accurate (verified by test cases)

## Implementation Order

1. **Date Range Picker** (2 hours): Reusable component with presets
2. **Report Layout** (1 hour): Shared layout for all report pages
3. **Revenue Report Backend** (3 hours): Aggregation queries
4. **Revenue Report Frontend** (3 hours): Page, charts, tables
5. **Staff Performance Backend** (2 hours): Utilization calculations
6. **Staff Performance Frontend** (2 hours): Comparison table
7. **Customer Analytics Backend** (2 hours): New vs returning logic
8. **Customer Analytics Frontend** (2 hours): Charts and top customers
9. **CSV Export** (2 hours): Server-side generation + download
10. **Testing** (2 hours): Verify calculations, test edge cases

## Open Questions

- **Q:** Should reports show draft/pending appointments?
  - **A:** No, only "completed" appointments count for revenue/performance.

- **Q:** How to handle deleted staff in performance reports?
  - **A:** Show all staff (including inactive) with appointments in date range.

- **Q:** Should we show staff member names or anonymize in owner reports?
  - **A:** Show real names (owner has full visibility).

- **Q:** Should customer report include customers with no appointments in range?
  - **A:** No, only customers with appointments in selected date range.

[/PRD]
