[PRD]
# PRD: Financial Management (M12 + M13)

## Overview

Owner-only financial management suite covering two main areas:

- **M12 — Structured Finance:** Expense tracking, additional revenue, gift cards, daily cash reconciliation, and staff commission management. Inline-editing experience with auto-save.
- **M13 — Freeform Spreadsheet:** Excel-like multi-sheet spreadsheet at `/{slug}/financials`. Full formula engine (50+ functions), rich formatting, conditional formatting, cell validation, merge/freeze panes, PDF export, and real-time Convex persistence.

Both modules are accessible only to salon **owners**. All financial amounts are stored as **kuruş integers** (100 = ₺1.00).

---

## Goals

- Give salon owners a single, integrated place to manage all financial data
- Provide structured forms for recurring financial operations (expenses, gift cards, daily closing)
- Provide a freeform spreadsheet for ad-hoc financial planning, P/L models, and custom reports
- Persist all data to Convex with real-time sync and no manual save button
- Prevent data loss on closed days (immutability after closing)

---

## Quality Gates

These commands must pass for every user story:

```bash
bunx convex dev    # Type generation — run in separate terminal, verify no type errors
bun run lint       # Biome check (filter _generated/ errors, they are expected)
bun run build      # Production build — must complete without errors
```

---

## User Stories

### US-M12-01: Expense CRUD
**Description:** As a salon owner, I want to create, edit, and delete expense records so that I can track all outgoing costs.

**Acceptance Criteria:**
- [ ] Expense form includes: date, amount (kuruş), category (13 types), description, payment method, optional vendor
- [ ] Amount must be > 0; validation error shown otherwise
- [ ] Expenses for a closed day cannot be created or edited (show appropriate message)
- [ ] Bulk delete: select multiple expenses and delete in one action
- [ ] Rate limit: 50 creates/day per org (`createExpense`)

---

### US-M12-02: Recurring Expense Templates
**Description:** As a salon owner, I want to mark an expense as recurring so that it auto-generates each period without manual entry.

**Acceptance Criteria:**
- [ ] Expense can be marked as recurring with a frequency (daily / weekly / monthly)
- [ ] `expenses.generateRecurring` internalMutation runs daily at 1 AM UTC via cron
- [ ] Generated entries have `recurringParentId` linking back to the template
- [ ] Template itself is never modified by the cron

---

### US-M12-03: Additional Revenue CRUD
**Description:** As a salon owner, I want to record non-appointment income (product sales, tips, gift card sales, other) so that daily revenue totals are complete.

**Acceptance Criteria:**
- [ ] Revenue form includes: date, amount, type (product_sale / tip / gift_card_sale / other), optional note, optional staff
- [ ] Inline editing on the list view (no dialog required)
- [ ] Entries for closed days are read-only
- [ ] Rate limit: 30 creates/day per org (`createAdditionalRevenue`)

---

### US-M12-04: Gift Card Issuance
**Description:** As a salon owner, I want to issue gift cards with auto-generated codes so that customers can redeem them for services.

**Acceptance Criteria:**
- [ ] 8-char alphanumeric code generated on create (excludes ambiguous chars 0/O/I/1)
- [ ] Code is unique per organization
- [ ] Fields: amount (kuruş), expiry date (optional), customer name (optional)
- [ ] Rate limit: 20 creates/day per org (`createGiftCard`)

---

### US-M12-05: Gift Card Redemption
**Description:** As a salon owner, I want to redeem a gift card by entering its code so that I can apply the balance to a transaction.

**Acceptance Criteria:**
- [ ] Look up gift card by code
- [ ] Partial redemption supported (redeem amount ≤ remaining balance)
- [ ] Expired or fully-used cards cannot be redeemed (error shown)
- [ ] `giftCards.expireOld` internalMutation runs daily at 2 AM UTC via cron

---

### US-M12-06: Daily Cash Reconciliation
**Description:** As a salon owner, I want to view a daily closing summary and enter the physical cash count so that I can verify my cash drawer.

**Acceptance Criteria:**
- [ ] `getForDate` computes revenue breakdown by payment method (virtual until day is closed)
- [ ] Cash count entry field with variance calculation (counted − expected)
- [ ] "Close Day" button locks the day; subsequent modification attempts are blocked
- [ ] Day closing is irreversible
- [ ] Rate limit: 5 closes/day per org (`closeDay`)

---

### US-M12-07: Commission Settings
**Description:** As a salon owner, I want to configure per-staff commission rates so that payouts can be computed automatically.

**Acceptance Criteria:**
- [ ] Two models: fixed percentage or tiered (revenue bracket → rate)
- [ ] Settings stored per staff member per org (`commissionSettings` table)
- [ ] `upsert` mutation creates or overwrites the setting

---

### US-M12-08: Commission Report
**Description:** As a salon owner, I want to see computed commission payouts for a date range so that I can process staff payments.

**Acceptance Criteria:**
- [ ] Report driven by completed appointments in range
- [ ] Shows per-staff: total revenue, commission rate applied, payout amount
- [ ] Tiered rates correctly select bracket based on period revenue
- [ ] Values are read-only; no manual override

---

### US-M12-09: Financial Dashboard
**Description:** As a salon owner, I want a dashboard overview of 6 KPIs so that I can quickly assess financial health.

**Acceptance Criteria:**
- [ ] KPI cards: Total Revenue, Total Expenses, Net P/L, Profit Margin %, Daily Average Revenue, Cash Flow
- [ ] Monthly bar chart comparing revenue vs expenses
- [ ] Data computed from `financials.getDashboardStats` (ownerQuery)

---

### US-M12-10: CSV Export
**Description:** As a salon owner, I want to export expense and revenue data as CSV so that I can use it in external tools.

**Acceptance Criteria:**
- [ ] Export button on expense list and revenue list
- [ ] CSV includes UTF-8 BOM (for Turkish character compatibility in Excel)
- [ ] Client-side generation — no server endpoint needed

---

### US-M13-01: Multi-Sheet Management
**Description:** As a salon owner, I want to create, rename, reorder, and delete spreadsheet sheets so that I can organize different financial models.

**Acceptance Criteria:**
- [ ] "+" button creates a new sheet (`Sheet{N}` default name)
- [ ] Double-click or right-click to rename
- [ ] Drag-to-reorder tabs (persisted via `spreadsheetSheets.reorder`)
- [ ] Delete sheet cascades to all its cells (`spreadsheetCells` deleted atomically)
- [ ] Auto-select first sheet on page load

---

### US-M13-02: Cell Value Entry & Auto-Save
**Description:** As a salon owner, I want to enter values into cells and have them auto-saved so that I never lose data.

**Acceptance Criteria:**
- [ ] Click or keyboard navigation to select cells
- [ ] Inline editing on double-click or Enter
- [ ] Changes debounced 300ms then flushed to `spreadsheetCells.upsertCell`
- [ ] Optimistic UI: changes appear instantly, Convex DB merges on top
- [ ] Empty cells are deleted from DB (sparse storage — no zero-value records)

---

### US-M13-03: Formula Engine
**Description:** As a salon owner, I want to use formulas (e.g. `=SUM(A1:A10)`) so that cells automatically compute values.

**Acceptance Criteria:**
- [ ] Formula cells start with `=`
- [ ] Supported categories: math (SUM, AVERAGE, MIN, MAX, COUNT…), text (CONCAT, LEN, UPPER…), date (TODAY, DATE, DATEDIF…), logical (IF, AND, OR, NOT), financial (PMT, FV, PV, NPV…), conditional (SUMIF, COUNTIF, AVERAGEIF…), lookup (VLOOKUP, HLOOKUP, INDEX, MATCH)
- [ ] Circular reference detection — show `#CIRC!` error
- [ ] Invalid formula — show `#ERROR!`
- [ ] Formula bar displays raw formula; cell displays computed value
- [ ] Formula evaluation is client-side only (no Convex computation)

---

### US-M13-04: Rich Cell Formatting
**Description:** As a salon owner, I want to format cells (bold, color, alignment, font) so that my spreadsheet is readable and professional.

**Acceptance Criteria:**
- [ ] Ribbon buttons: bold, italic, underline, align left/center/right
- [ ] Font family and font size pickers
- [ ] Background color and text color pickers (hex + palette)
- [ ] All formatting fields persisted to `spreadsheetCells` (no client-only state)

---

### US-M13-05: Number Formats
**Description:** As a salon owner, I want to format cells as currency, percentage, or date so that numbers display correctly.

**Acceptance Criteria:**
- [ ] Format options: general, number, currency (₺), percent, date, time, custom
- [ ] Format applied to display value only; raw value always stored as string
- [ ] Number format persisted in `numberFormat` field on cell

---

### US-M13-06: Conditional Formatting
**Description:** As a salon owner, I want to highlight cells based on rules (e.g. negative values in red) so that exceptions stand out visually.

**Acceptance Criteria:**
- [ ] Rule dialog supports: cell value comparisons, color scale, data bar, icon sets
- [ ] Rules evaluated client-side on each render
- [ ] Rules stored as JSON string in `spreadsheetSheets.conditionalFormats`
- [ ] Multiple rules per sheet; priority order respected

---

### US-M13-07: Cell Validation Rules
**Description:** As a salon owner, I want to restrict cell input to specific values (dropdown, number range, date) so that data entry is consistent.

**Acceptance Criteria:**
- [ ] Validation types: dropdown list, number (between/greater/less), date constraint, text length, custom formula
- [ ] Dropdown cells show a picker on click
- [ ] Invalid input shows inline error tooltip
- [ ] Validation rule stored as JSON string in `spreadsheetCells.validationRule`

---

### US-M13-08: Merge Cells & Freeze Panes
**Description:** As a salon owner, I want to merge cells for headers and freeze rows/columns for navigation so that large sheets are easier to use.

**Acceptance Criteria:**
- [ ] Select range → right-click → Merge / Unmerge
- [ ] Merged regions persisted in `spreadsheetSheets.mergedRegions`
- [ ] Freeze Rows N / Freeze Cols N via View menu; persisted in `freezeRow`/`freezeCol`
- [ ] Frozen cells remain visible while scrolling

---

### US-M13-09: Row & Column Management
**Description:** As a salon owner, I want to insert/delete rows and columns and resize columns so that I can adjust my layout.

**Acceptance Criteria:**
- [ ] Insert row above/below via context menu; all cell refs shift down
- [ ] Delete row via context menu; cell refs shift up
- [ ] Insert/delete column with ref shift (A→B, etc.)
- [ ] Structural mutations use `replaceAllCells` for atomicity
- [ ] Column resize via drag handle; width stored in local state (not persisted)
- [ ] Add Row / Add Column buttons at sheet edge

---

### US-M13-10: Fill Series & AutoFill
**Description:** As a salon owner, I want to drag the fill handle to auto-complete sequences (1, 2, 3… or Mon, Tue…) so that I can fill data quickly.

**Acceptance Criteria:**
- [ ] Fill handle visible on bottom-right of selected cell
- [ ] Series detection: numeric progression, date sequence, repeated pattern
- [ ] Formula refs auto-adjust when filling (e.g. `=A1` → `=A2` on fill down)
- [ ] Ctrl+D fill down, Ctrl+R fill right keyboard shortcuts

---

### US-M13-11: Undo / Redo
**Description:** As a salon owner, I want to undo and redo changes so that I can recover from mistakes.

**Acceptance Criteria:**
- [ ] Ctrl+Z undoes last cell/format change
- [ ] Ctrl+Y / Ctrl+Shift+Z redoes
- [ ] Undo history managed by `useUndoHistory` hook (client state only)
- [ ] History resets on sheet tab change

---

### US-M13-12: PDF Export
**Description:** As a salon owner, I want to export the current sheet as a PDF so that I can print or share it.

**Acceptance Criteria:**
- [ ] "Export PDF" button opens dialog with orientation / page size options
- [ ] Export renders current cell values, formatting, and merged regions
- [ ] Uses canvas-based rendering (`lib/pdf-export.ts`) — no server action needed
- [ ] Downloaded file named `{sheetName}.pdf`

---

## Functional Requirements

- FR-1: All financial queries use `ownerQuery`/`ownerMutation` — non-owner roles receive HTTP 403
- FR-2: All financial amounts stored as kuruş integers; display conversion done at UI layer
- FR-3: Closed day immutability enforced at mutation level (`dailyClosing.ts` checks `isClosed`)
- FR-4: Spreadsheet cells use sparse storage — insert only when value or format is non-empty
- FR-5: Spreadsheet formula evaluation is client-side; Convex stores raw strings only
- FR-6: `conditionalFormats` and `validationRule` stored as JSON strings in Convex
- FR-7: `replaceAllCells` used for all structural mutations (row/col insert/delete) to maintain ref consistency
- FR-8: Rate limits enforced: createExpense (50/day), createAdditionalRevenue (30/day), createGiftCard (20/day), closeDay (5/day)
- FR-9: Gift card codes are 8-char alphanumeric, unique per org, excluding 0/O/I/1
- FR-10: Spreadsheet max dimensions: 52 columns (A–AZ) × 5,000 rows per sheet

---

## Non-Goals

- Staff or customer access to financial data (owner-only)
- Server-side formula evaluation
- Real-time multi-user collaboration on the spreadsheet
- Spreadsheet import from Excel/CSV (future enhancement)
- Manual commission overrides (commission is always computed from appointments)
- Gift card online redemption by customers (staff/owner only)
- Column width persistence to Convex (local state only)

---

## Technical Considerations

- `src/modules/financials/` contains both M12 structured components and M13 spreadsheet components
- Backend files: `convex/expenses.ts`, `convex/additionalRevenue.ts`, `convex/giftCards.ts`, `convex/dailyClosing.ts`, `convex/commissionSettings.ts`, `convex/financials.ts`, `convex/spreadsheetSheets.ts`, `convex/spreadsheetCells.ts`
- Page entry point: `src/app/[slug]/(authenticated)/financials/page.tsx`
- Crons: `expenses.generateRecurring` (daily 1AM UTC), `giftCards.expireOld` (daily 2AM UTC)
- Spreadsheet context shared via `lib/spreadsheet-context.tsx`
- `useFreeformCells` hook manages optimistic pending queue with 300ms debounce flush

---

## Success Metrics

- Owner can complete a full day's financial entry (expenses + revenue + closing) without page reloads
- Formula evaluation returns correct results for all 50+ supported functions
- Sheet with 500 non-empty cells loads and renders in < 500ms
- No data loss on browser refresh (all changes persisted to Convex within debounce window)

---

## Open Questions

- Should column widths be persisted to Convex in a future update?
- Should gift cards be redeemable during online booking (public flow)?
- Should spreadsheet support CSV import for bulk data entry?
[/PRD]
