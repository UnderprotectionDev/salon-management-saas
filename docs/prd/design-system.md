# Design System

> **Framework:** shadcn/ui (New York style), Tailwind CSS v4

## Color System

| Color | CSS Variable | Use Case |
|-------|-------------|----------|
| Primary | `--primary` (black / white in dark) | Default buttons, high-contrast text |
| Brand | `--brand` (blue-600 / blue-500 dark) | CTAs, active states, focus rings, links |
| Secondary | `--secondary` | Secondary actions, subtle backgrounds |
| Accent | `--accent` | Hover/focus backgrounds (shadcn internal) |
| Destructive | `--destructive` (red) | Delete, errors |
| Muted | `--muted` | Disabled, placeholders |

### Brand Color Usage

Use `--brand` (`bg-brand`, `text-brand`, `border-brand`) for:

- Call-to-action buttons (onboarding, booking)
- Active/selected states (step indicators, type selections)
- Focus rings on custom inputs
- Unread indicators (notification dot, unread background)
- "Today" highlights in calendar views

Use `--primary` (black/white) for:

- Default shadcn buttons (`<Button>`)
- High-contrast text, headings
- Default focus rings on shadcn components

Do **not** change `--accent` — it is used by 15+ shadcn components for hover/focus backgrounds.

### Appointment Status Colors

Centralized in `src/lib/status-colors.ts`. CSS variables defined in `globals.css` (`--status-*-bg`, `--status-*-text`).

| Status | Token | Light Appearance |
|--------|-------|-----------------|
| pending | `status-pending` | Yellow |
| confirmed | `status-confirmed` | Blue |
| checked_in | `status-checked-in` | Indigo |
| in_progress | `status-in-progress` | Purple |
| completed | `status-completed` | Green |
| cancelled | `status-cancelled` | Gray |
| no_show | `status-no-show` | Red |

**Usage:**

```tsx
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  type AppointmentStatus,
} from "@/lib/status-colors";

// Badge
<Badge className={APPOINTMENT_STATUS_BADGE_CLASSES[status]}>
  {APPOINTMENT_STATUS_LABELS[status]}
</Badge>

// Calendar block
const { bg, text, border } = APPOINTMENT_STATUS_COLORS[status];
<div className={`${bg} ${text} ${border}`}>...</div>
```

**AI Status Colors:**

| Status | Classes |
|--------|---------|
| pending | `bg-blue-100 text-blue-800` |
| processing | `bg-purple-100 text-purple-800 animate-pulse` |
| completed | `bg-green-100 text-green-800` |
| failed | `bg-red-100 text-red-800` |

## Typography

- **Sans font:** JetBrains Mono (monospace — configured as `--font-sans`)
- **Mono font:** IBM Plex Mono (configured as `--font-mono`)
- **Scale:** text-xs (12px) → text-3xl (30px)
- **Headings:** h1=text-2xl/semibold, h2=text-xl/semibold, h3=text-lg/medium

## Spacing

| Context | Class |
|---------|-------|
| Page padding (mobile/desktop) | `p-4` / `p-6` |
| Card padding | `p-4` |
| Section gap | `space-y-8` |
| Form field gap | `space-y-4` |
| Button group gap | `gap-2` |

## Component Patterns

| Component | When to Use |
|-----------|-------------|
| Button (default/secondary/destructive/outline/ghost/link) | Actions, CTAs |
| Card + CardHeader/Content/Footer | Content containers |
| Badge (default/secondary/destructive/outline) | Status indicators |
| Dialog + DialogContent | Confirmations, forms |
| Table + TableHeader/Body/Row/Cell | Data lists |
| Sheet (side panel) | Mobile navigation |
| Skeleton | Loading placeholders |
| Alert (destructive variant) | Error messages |
| Before/After comparison | Side-by-side image view (AI simulation results) |
| Chat interface | Message bubbles, streaming indicator, thread list |
| Credit balance badge | Inline display with coin icon + count |
| Skeleton → reveal | Blur-to-sharp animation (AI processing result reveal) |

**Button sizes:** default (h-10), sm (h-9), lg (h-11), icon (h-10 w-10)

## Layout Patterns

- **Dashboard:** Header (h-14) + Sidebar (w-64, hidden on mobile) + Main (flex-1, p-6)
- **Booking wizard:** Progress bar + centered content (max-w-2xl) + Back/Continue
- **Calendar:** Time column + staff columns (horizontal scroll)
- **AI Page:** Tab navigation (Photo Analysis, Simulation, Chat, Mood Board, Care Schedule) + Credit balance header badge
- **AI Insights:** Tab navigation (Revenue Forecast, Credit Management) for admin/owner

## Mobile

- Touch targets: min 44x44px
- Breakpoints: sm=640, md=768, lg=1024, xl=1280
- Navigation: Bottom bar (booking), hamburger menu (dashboard)

## Accessibility Checklist

- Color contrast ≥ 4.5:1
- Focus indicators on all interactive elements
- All images have alt text
- Form inputs have labels
- Keyboard navigation works throughout
- Honor `prefers-reduced-motion`
