# Reports & Analytics Improvements Plan

**Date:** 2026-02-16
**Milestone:** 8 - Reports & Analytics
**Scope:** Bug fixes + improvements + new features (user + admin)

---

## Phase 1: Critical Bug Fixes (Backend - `convex/reports.ts`)

### 1. Fix `appointmentServices` Full Table Scan
**File:** `convex/reports.ts:135-155`
**Problem:** `.withIndex("by_appointment").collect()` scans ALL appointment services across ALL tenants (no key specified).
**Fix:** Iterate over `completedApptIds` and query by index per appointment:

```typescript
const completedApptIds = new Set(
  appointments.filter((a) => a.status === "completed").map((a) => a._id),
);

const apptServiceMap = new Map();
const serviceQueries = Array.from(completedApptIds).map(async (apptId) => {
  const services = await ctx.db
    .query("appointmentServices")
    .withIndex("by_appointment", (q) => q.eq("appointmentId", apptId))
    .collect();
  apptServiceMap.set(apptId, services.map((s) => ({
    serviceId: s.serviceId, serviceName: s.serviceName, price: s.price,
  })));
});
await Promise.all(serviceQueries);
```

### 2. Fix Staff Security Vulnerability
**Files:** `convex/reports.ts:80-81, 340-341, 484-485`
**Problem:** When `ctx.member.role === "staff"` but `ctx.staff` is null/undefined, `staffFilter` becomes `undefined`, and the staff member sees ALL org data (owner-level access).
**Fix:** Add guard at the top of all 3 report functions:

```typescript
const isStaffOnly = ctx.member.role === "staff";
if (isStaffOnly && !ctx.staff) {
  throw new ConvexError({
    code: ErrorCode.FORBIDDEN,
    message: "Staff record not found for current user",
  });
}
const staffFilter = isStaffOnly ? ctx.staff!._id : undefined;
```

### 3. Use Set for O(1) Lookup
**File:** `convex/reports.ts:146`
**Problem:** `completedApptIds.includes(s.appointmentId)` is O(n) per iteration.
**Fix:** Already addressed in fix #1 - `completedApptIds` is now a `Set` with `.has()` method.

### 4. Fix Unbounded scheduleOverrides/staffOvertime Queries
**File:** `convex/reports.ts:387-401`
**Problem:** Queries all overrides/overtime for each staff member with no date bounds, then filters client-side.
**Fix:** Use `.gte()/.lte()` on the `by_staff_date` compound index:

```typescript
const overrides = await ctx.db
  .query("scheduleOverrides")
  .withIndex("by_staff_date", (q) =>
    q.eq("staffId", staff._id).gte("date", args.startDate).lte("date", args.endDate),
  )
  .collect();
// No client-side filter needed - same for staffOvertime
```

### 5. Add Date Format Validation
**File:** `convex/reports.ts:52-67` (`validateDateRange`)
**Problem:** `startDate` and `endDate` are `v.string()` with no format validation. Malformed strings could cause infinite loops or NaN values.
**Fix:** Add regex validation:

```typescript
function validateDateRange(startDate: string, endDate: string) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Date must be in YYYY-MM-DD format",
    });
  }
  // ... existing validation
}
```

### 6. Add sanitizeCsvValue to Revenue CSV Export
**File:** `src/modules/reports/components/RevenueReport.tsx:35`
**Problem:** Revenue CSV export doesn't use `sanitizeCsvValue` on date strings, inconsistent with other reports.
**Fix:** Import and apply `sanitizeCsvValue`:

```typescript
const rows = report.daily.map((d) => [
  sanitizeCsvValue(d.date),
  (d.revenue / 100).toFixed(2),
  d.appointments,
  d.completed,
]);
```

---

## Phase 2: Admin/Owner Frontend Improvements

### 7. Locale Consistency (tr-TR)
**Files:**
- `RevenueChart.tsx:34` - Chart X-axis labels
- `DateRangePicker.tsx:24` - Date display format
- `TopCustomersTable.tsx:54` - Last visit date
- `NewVsReturningChart.tsx:33` - Month labels

**Change:** Replace all `toLocaleDateString("en-US", ...)` with `tr-TR`:
- "Jan 15" → "15 Oca"
- "Jan '25" → "Oca '25"

### 8. Revenue CSV Export Expansion
**File:** `src/modules/reports/components/RevenueReport.tsx`
**Change:** Replace single export button with dropdown menu offering 3 exports:
- **Daily Revenue CSV** - Current behavior (date, revenue, appointments, completed)
- **Revenue by Service CSV** - (service name, appointments, revenue)
- **Revenue by Staff CSV** - (staff name, appointments, revenue)

Use `DropdownMenu` from shadcn/ui with `ExportCsvButton` as trigger.

### 9. Staff Performance KPI Cards
**File:** `src/modules/reports/components/StaffPerformanceReport.tsx`
**Change:** Add 4 summary cards above the table:
- **Total Appointments** - Sum of all staff appointments
- **Total Revenue** - Sum of all staff revenue, formatPrice()
- **Avg Utilization** - Average of all staff utilization percentages
- **Highest No-Show** - Staff name with highest no-show rate and percentage

Use existing `ReportCard` component.

### 10. Error State Handling
**Files:** `RevenueReport.tsx`, `StaffPerformanceReport.tsx`, `CustomerReport.tsx`
**Change:** Handle error states from Convex queries. Currently `report === undefined` is loading, `null` means skipped, but query errors show nothing.

Add error boundary or catch pattern:
```tsx
// After loading check, add:
if (report === null && activeOrganization) {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <p className="text-sm text-muted-foreground">Unable to load report data.</p>
    </div>
  );
}
```

### 11. Service Popularity Chart (Pie/Donut)
**New file:** `src/modules/reports/components/ServicePopularityChart.tsx`
**Location:** Revenue report tab, alongside the by-service table
**Implementation:**
- recharts `PieChart` + `Pie` + `Cell` components
- Max 6 slices, remaining grouped as "Other"
- Colors from CSS chart variables
- Tooltip shows service name, appointment count, revenue
- Props: `{ data: Array<{ serviceName: string; revenue: number }> }`

### 12. Peak Hours Analysis (Bar Chart)
**New file:** `src/modules/reports/components/PeakHoursChart.tsx`
**Backend change:** Add `hourlyDistribution` field to `getRevenueReport` return value:
```typescript
hourlyDistribution: Array<{ hour: number; count: number }>
// e.g., [{ hour: 9, count: 15 }, { hour: 10, count: 23 }, ...]
```
**Implementation:**
- recharts vertical `BarChart`
- X-axis: hours (09:00-21:00 format)
- Y-axis: appointment count
- Highlight the peak hour bar with accent color
- New validator: `hourlyDistributionValidator` in validators.ts

### 13. Staff Utilization Chart (Horizontal Bar)
**New file:** `src/modules/reports/components/StaffUtilizationChart.tsx`
**Location:** Staff Performance tab, above the table
**Implementation:**
- recharts horizontal `BarChart` (layout="vertical")
- Y-axis: staff names
- X-axis: utilization percentage (0-100%)
- Color scale: <50% amber, 50-80% green, 80%+ blue
- Props: `{ data: Array<{ staffName: string; utilization: number }> }`

### 14. Customer Report Comparison Indicators
**Backend change:** Add previous period calculation to `getCustomerReport`:
```typescript
// Return additions:
totalActiveChange: number;  // % change vs previous period
newInPeriodChange: number;
retentionRateChange: number;
```
**Frontend change:** Pass `change` prop to `ReportCard` components in CustomerReport.
**Validator change:** Add 3 new number fields to `customerReportValidator`.

---

## Phase 3: Customer Dashboard (New Feature)

### 15. Backend Query: getCustomerDashboard
**File:** New: `convex/customerDashboard.ts`
**Wrapper:** `authedQuery` (requires authenticated user, no org context)
**Logic:**
1. Find user's `userId` from auth context
2. Query all `customers` records linked to this userId (across all orgs)
3. For each customer record, fetch completed appointments
4. Aggregate: total visits, this month visits, total spent, monthly avg
5. Compute favorite services from `appointmentServices`
6. Build monthly spending trend (last 12 months)
7. Get recent 10 appointments for timeline

**Return shape (with validator):**
```typescript
{
  totalVisits: number;
  thisMonthVisits: number;
  lastVisitDate: string | null;
  totalSpent: number;
  monthlyAvgSpent: number;
  favoriteServices: Array<{
    serviceName: string;
    count: number;
    totalSpent: number;
  }>;
  monthlySpending: Array<{
    month: string;
    amount: number;
    visits: number;
  }>;
  recentAppointments: Array<{
    appointmentId: Id<"appointments">;
    salonName: string;
    salonSlug: string;
    date: string;
    startTime: number;
    endTime: number;
    status: string;
    services: string[];
    total: number;
  }>;
  salons: Array<{
    organizationId: Id<"organization">;
    name: string;
    slug: string;
    totalVisits: number;
    totalSpent: number;
  }>;
}
```

### 16. Visit Summary KPI Cards
**Component:** Part of customer dashboard page
**Cards:**
- **Total Visits** - All salons combined
- **This Month** - Current month visits
- **Last Visit** - Date + salon name
- **Registered Salons** - Count of salons

### 17. Spending Statistics
**Component:** Part of customer dashboard page
**Cards:**
- **Total Spent** - formatPrice() display
- **Monthly Average** - Last 12 months average
- **Most Spent On** - Service name with highest total

### 18. Visit History Timeline
**Component:** `VisitHistoryTimeline.tsx`
**Implementation:**
- List of last 10 appointments in reverse chronological order
- Each entry: salon name, date, time, services list, total, status badge
- Clickable salon name links to `/[slug]/book`

### 19. Favorite Services
**Component:** `FavoriteServicesList.tsx`
**Implementation:**
- Top 5 services by booking count
- Service name, count, total spent
- Simple table or card list

### 20. Spending Trend Chart + Page Setup
**Page:** `src/app/dashboard/stats/page.tsx` → route: `/dashboard/stats`
**Layout:** `src/app/dashboard/layout.tsx` - Minimal layout with back link to `/dashboard`
**Chart:** recharts AreaChart with dual Y-axis (spending left, visits right)
- X-axis: last 12 months
- Follows same pattern as `RevenueChart.tsx`

**Dashboard link:** Add "My Stats" button/link on `/dashboard` page to navigate to `/dashboard/stats`

---

## Implementation Order

1. Phase 1 (Bug fixes): Items 1-6 in `convex/reports.ts` and `RevenueReport.tsx`
2. Phase 2 (Admin improvements): Items 7-14
3. Phase 3 (Customer dashboard): Items 15-20
4. Run `bun run lint` after all changes
5. Run `bun run build` to verify types

## Files to Create
- `src/modules/reports/components/ServicePopularityChart.tsx`
- `src/modules/reports/components/PeakHoursChart.tsx`
- `src/modules/reports/components/StaffUtilizationChart.tsx`
- `convex/customerDashboard.ts`
- `src/app/dashboard/stats/page.tsx`
- `src/app/dashboard/layout.tsx`

## Files to Modify
- `convex/reports.ts` (bug fixes + hourlyDistribution + customer comparison)
- `convex/lib/validators.ts` (new validators)
- `src/modules/reports/components/RevenueReport.tsx`
- `src/modules/reports/components/StaffPerformanceReport.tsx`
- `src/modules/reports/components/CustomerReport.tsx`
- `src/modules/reports/components/RevenueChart.tsx`
- `src/modules/reports/components/DateRangePicker.tsx`
- `src/modules/reports/components/TopCustomersTable.tsx`
- `src/modules/reports/components/NewVsReturningChart.tsx`
- `src/modules/reports/lib/csv.ts` (if needed)
- `src/modules/reports/index.ts` (new exports)
- `src/app/dashboard/page.tsx` (add stats link)
