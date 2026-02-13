# Product Overview

## Vision

All-in-one salon management platform for Turkish beauty salons (1-10 staff). Solves: manual scheduling, no-shows, phone-only booking, lack of business insights, fragmented tools.

**Target:** ~150,000 registered beauty salons in Turkey (Istanbul, Ankara, Izmir).

## User Personas

| Persona | Role | Goals | Key Tasks |
|---------|------|-------|-----------|
| Salon Owner (Ahmet) | Owner, 35-55 | Revenue visibility, reduce ops burden | Dashboard, manage staff, configure services, reports, billing |
| Staff Member (Ayse) | Staff, 22-35 | Manage own schedule, track appointments | View own schedule, request time-off, define overtime |
| Customer (Mehmet) | End user, 25-45 | Easy online booking, manage own bookings | Browse services, book online, cancel/reschedule |

**Roles:** Owner (full access, 1 per org) | Staff (own schedule only). Auth via Google OAuth.

## Business Model

| Aspect | Details |
|--------|---------|
| Model | B2B SaaS, per-salon subscription |
| Monthly | ₺500/month |
| Yearly | ₺5,100/year (15% savings) |
| Features | Single tier, full access, no free trial |
| AI Credits | Pay-as-you-go credit packages (50/200/500) for AI features via Polar one-time checkout |
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
| AI Adoption | 30%+ of active salons use AI features |
| Page Load (P95) | <2s |
