# Design System

> **Framework:** shadcn/ui (New York style), Tailwind CSS v4

## Color System

| Color | CSS Variable | Use Case |
|-------|-------------|----------|
| Primary | `--primary` (blue) | CTAs, links, focus states |
| Secondary | `--secondary` | Secondary actions |
| Destructive | `--destructive` (red) | Delete, errors |
| Success | `--success` (green) | Confirmations |
| Warning | `--warning` (amber) | Alerts, cautions |
| Muted | `--muted` | Disabled, placeholders |

**Appointment Status Colors:**

| Status | Classes |
|--------|---------|
| pending | `bg-yellow-100 text-yellow-800` |
| confirmed | `bg-blue-100 text-blue-800` |
| checked_in | `bg-green-100 text-green-800` |
| in_progress | `bg-purple-100 text-purple-800` |
| completed | `bg-gray-100 text-gray-800` |
| cancelled | `bg-red-100 text-red-800 line-through` |
| no_show | `bg-red-100 text-red-800` |

## Typography

- **Font:** Inter (sans), JetBrains Mono (mono)
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

**Button sizes:** default (h-10), sm (h-9), lg (h-11), icon (h-10 w-10)

## Layout Patterns

- **Dashboard:** Header (h-14) + Sidebar (w-64, hidden on mobile) + Main (flex-1, p-6)
- **Booking wizard:** Progress bar + centered content (max-w-2xl) + Back/Continue
- **Calendar:** Time column + staff columns (horizontal scroll)

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
