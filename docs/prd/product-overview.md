# Product Overview

## Vision

All-in-one salon management platform for Turkish beauty salons (1-10 staff). Solves: manual scheduling, no-shows, phone-only booking, lack of business insights, fragmented tools.

**Target:** ~150,000 registered beauty salons in Turkey (Istanbul, Ankara, Izmir).

## User Personas

| Persona | Role | Goals | Key Tasks |
|---------|------|-------|-----------|
| Salon Owner (Ahmet) | Owner, 35-55 | Revenue visibility, reduce ops burden | Dashboard, manage staff, configure services, reports |
| Admin Staff (Ayse) | Admin, 22-35 | Fast booking, schedule coordination | Book appointments, check-in, manage schedule, approve time-off |
| Customer (Mehmet) | End user, 25-45 | Easy online booking, manage own bookings | Browse services, book online, cancel/reschedule |

**Roles:** Owner > Admin > Member (no separate Receptionist role). Auth via Google OAuth.

## Business Model

| Aspect | Details |
|--------|---------|
| Model | B2B SaaS, per-salon subscription |
| Monthly | ₺500/month |
| Yearly | ₺5,100/year (15% savings) |
| Features | Single tier, full access, no free trial |
| Platform | Polar.sh billing |
| Grace Period | 7 days after payment failure (reminders day 1,3,5,7) |
| Suspended | Billing page only after grace period |
| Data Retention | 30 days after subscription ends |

## Key Product Decisions

| Decision | Choice |
|----------|--------|
| Customer accounts | Hybrid: guest → recognized (2nd visit) → prompted (3rd) → registered |
| Language | English (MVP), Turkish (post-MVP) via react-i18next |
| Platform | Responsive web only (no native apps) |
| Location model | 1 org = 1 location (MVP) |
| Payment processing | Platform billing only, no customer payments (MVP) |

## Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Active Salons | 10+ (>10 bookings/month) |
| Monthly Bookings | 1,000+ |
| System Uptime | 99.9% |
| No-Show Rate | <10% (from 15-20%) |
| Churn Rate | <5% monthly |
| Page Load (P95) | <2s |
