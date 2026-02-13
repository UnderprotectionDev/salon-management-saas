# Booking Page Redesign V2 - Hanson Method Inspired

**Date:** 2026-02-13
**Status:** Approved
**Inspiration:** Hanson Method (primary), Innove Salon (secondary)

## Design Decisions

- **Layout:** 2-column (left sidebar + main content), sticky bottom bar
- **Top header:** Salon name (bold) + current date + location + OPEN/CLOSED status
- **Left sidebar:** Address + Contact info + Logo (hidden on mobile)
- **Services:** Numbered rows (01, 02...), selected = primary color highlight, multi-select
- **Specialist:** Inline step with avatar cards
- **Date:** Weekly grid (Mon-Sun) with slot count per day, week navigation arrows
- **Time:** Grid slots directly under date picker
- **Bottom bar:** Selected services + Total price + Date + CONFIRM BOOKING button
- **Customer form:** Dialog/modal on CONFIRM click
- **Steps:** All visible, disabled until prerequisites met, no accordion
- **Colors:** globals.css only (monospace, black/white primary, 0.2rem radius)
- **Mobile:** Single column, sidebar hidden, sticky bottom bar

## Layout Structure

```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ SALON NAME (bold)        CURRENT DATE | LOCATION | OPEN  │
├────────────┬─────────────────────────────────────────────┤
│ ADDRESS    │ 01 / HIZMET SECIMI                          │
│ ...        │ 01  SAC KESIMI          200,00 TL    30 DK  │
│            │ 02  FON + BAKIM  ████   350,00 TL    45 DK  │
│ CONTACT    │                                              │
│ ...        │ 02 / PERSONEL SECIMI                         │
│            │ [Avatar] Ahmet  [Avatar] Zeynep  [Uygun]     │
│ [LOGO]     │                                              │
│            │ 03 / TARIH & SAAT              SUB / MAR 2026│
│            │ PZT  SAL  CAR  PER  CUM  CMT  PAZ           │
│            │  24  [25]  26   27   28   01   02            │
│            │      3slt 8slt 5slt 12sl                     │
│            │                                              │
│            │ 09:00  09:30  [10:00]  10:30  11:00          │
├────────────┴─────────────────────────────────────────────┤
│ SELECTED: Fon+Bakim | TOTAL: 350 TL | 25.02 | ONAYLA -> │
└──────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────┐
│ SALON NAME       ● ACIK  │
├──────────────────────────┤
│ 01 / HIZMET SECIMI       │
│ ...                      │
│ 02 / PERSONEL SECIMI     │
│ ...                      │
│ 03 / TARIH & SAAT        │
│ ...                      │
├──────────────────────────┤
│ 350 TL      [ONAYLA ->]  │
└──────────────────────────┘
```

## Backend Changes

New `getPublicSettings` publicQuery returning curated subset (no billing/subscription).

## Component Architecture

### New
- BookingPageHeader.tsx
- SalonSidebar.tsx
- WeeklyDatePicker.tsx
- ConfirmBookingDialog.tsx

### Refactored
- ServiceSelector.tsx (numbered rows)
- StaffSelector.tsx (inline avatars)
- TimeSlotGrid.tsx (simplified grid)
- StickyBottomBar.tsx (rich content)
- useBookingFlow.ts (no accordion state)
- book/page.tsx (complete rewrite)
- book/layout.tsx (simplified)
