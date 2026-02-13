# Single-Page Booking Redesign

**Date:** 2026-02-13
**Status:** Approved
**Problem:** 5-step wizard booking flow takes too long for customers

## Design Decisions

- **Layout:** Single page with 4 accordion panels
- **Collapsed display:** Compact summary chips showing selection details
- **Step grouping:** Services, Staff, DateTime, Confirm (customer info merged into confirm)
- **Summary:** Sticky bottom bar with service count, duration, price
- **Progression:** Auto-advance with smooth scroll on "Continue" button click
- **Reset behavior:** Smart cascade reset (minimum necessary resets)

## Layout

```
┌─────────────────────────────────────┐
│         Salon Name                  │
│       Online Randevu Al             │
├─────────────────────────────────────┤
│ ▼ 1. Hizmet Secimi        [active] │
│   Service list + Continue button    │
├─────────────────────────────────────┤
│ ► 2. Personel Secimi        [idle] │
├─────────────────────────────────────┤
│ ► 3. Tarih & Saat           [idle] │
├─────────────────────────────────────┤
│ ► 4. Bilgiler & Onay        [idle] │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 2 hizmet · 65dk · 500 TL  [Onayla] │  <- Sticky bottom bar
└─────────────────────────────────────┘
```

## Accordion Panel States

| State | Appearance | Interaction |
|-------|-----------|-------------|
| `idle` | Title + disabled | Not clickable (previous step incomplete) |
| `active` | Open, content visible | Selections can be made |
| `completed` | Title + summary chip + edit icon | Click to re-expand |

### Summary Chips

- **Services:** `Fon + Bakim · 65dk · 500 TL`
- **Staff:** `Ahmet Y.` or `Uygun Personel`
- **DateTime:** `14 Subat Cuma · 10:30`

## Smart Reset Rules

```
Service changed:
  → Staff still eligible? Yes → Staff stays, DateTime resets
  → Staff not eligible? → Staff + DateTime reset

Staff changed:
  → DateTime resets (availability changes)

Date changed:
  → Only time slot resets

Time changed:
  → Slot lock refreshes, nothing else resets
```

## Sticky Bottom Bar

| State | Bar Content |
|-------|-------------|
| No services selected | Hidden |
| Services selected, other steps incomplete | `2 hizmet · 65dk · 500 TL` (info only, no button) |
| All steps done, Panel 4 open | `Toplam: 500 TL` + `Randevuyu Onayla` button |
| All steps done, Panel 4 closed | `Toplam: 500 TL` + `Randevuyu Onayla` button (scrolls to Panel 4) |

## Panel 4: Bilgiler & Onay (Combined)

Contains:
1. Customer info form (name, phone, email, notes) - pre-filled from auth session
2. Appointment summary (services, staff, date/time, totals)
3. Slot lock countdown
4. "Randevuyu Onayla" button

## Component Architecture

### New Components
- `BookingAccordion.tsx` - Main accordion container + orchestration
- `AccordionPanel.tsx` - Single panel (idle/active/completed states)
- `AccordionSummaryChip.tsx` - Collapsed summary display
- `StickyBottomBar.tsx` - Fixed bottom bar

### Modified Components
- `useBookingFlow.ts` - Step machine → accordion state management
- `constants.ts` - 5 steps → 4 panels
- `BookingForm.tsx` - Remove onBack/onSubmit, use onChange pattern

### Unchanged Components
- `ServiceSelector.tsx`
- `StaffSelector.tsx`
- `DatePicker.tsx`
- `TimeSlotGrid.tsx`
- `BookingConfirmation.tsx`
- `SlotLockCountdown.tsx`

### Removed
- `BookingSummary.tsx` - Content inlined into confirm panel

### Page Refactor
- `book/page.tsx` - Simplified, delegates to BookingAccordion

## State Shape

```typescript
type AccordionState = {
  // Selections
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
  date: string | null;
  slotStartTime: number | null;
  slotEndTime: number | null;
  lockId: Id<"slotLocks"> | null;
  lockExpiresAt: number | null;
  sessionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes: string;

  // Accordion control
  activePanel: "services" | "staff" | "datetime" | "confirm" | null;
  completedPanels: Set<string>;
};
```

## Backend Changes

None. This is a frontend-only refactor. All Convex functions remain unchanged.

## Implementation Order

1. Create AccordionPanel + AccordionSummaryChip components
2. Create StickyBottomBar component
3. Refactor useBookingFlow hook (step machine → accordion state + smart reset)
4. Create BookingAccordion (orchestration component)
5. Update BookingForm (onChange pattern)
6. Update constants.ts (4 panels)
7. Refactor book/page.tsx
8. Test & polish animations
