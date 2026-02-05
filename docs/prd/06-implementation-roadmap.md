# 06 - Implementation Roadmap

> **Version:** 1.0.0
> **Last Updated:** 2026-02-05
> **Status:** Active Development
> **Scope:** MVP (P0 + P1)

Bu dokuman, Google Auth entegrasyonu sonrasi kalan gorevlerin detayli uygulama yol haritasini icerir.

---

## Mevcut Durum

### Tamamlanan (Pre-Sprint)

| Kategori | Durum | Detay |
|----------|-------|-------|
| **Authentication** | ✅ Done | Better Auth + Google OAuth |
| **Convex Setup** | ✅ Done | HTTP router, client provider |
| **Auth UI** | ✅ Done | Sign-in view, auth components |
| **UI Library** | ✅ Done | 56 shadcn/ui component |
| **Temel Sayfalar** | ✅ Done | Landing, sign-in, dashboard (bos) |

### Eksik (Sprint'lerde Yapilacak)

| Kategori | Oncelik | Sprint |
|----------|---------|--------|
| Database Schema | P0 | Sprint 1 |
| Multi-Tenant Setup | P0 | Sprint 1 |
| Service Catalog | P0 | Sprint 2 |
| Staff Management | P0 | Sprint 2 |
| Booking Engine | P0 | Sprint 3-4 |
| Admin Dashboard | P0 | Sprint 5 |
| SaaS Billing (Polar) | P0 | Sprint 6 |
| Email (Resend) | P1 | Sprint 7 |
| Reports & Analytics | P1 | Sprint 8 |
| Customer Portal | P1 | Sprint 9 |

---

## Bagimlilik Haritasi

```
                        ┌─────────────────────┐
                        │   AUTH (✅ Done)    │
                        │  Better Auth/Google │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   SPRINT 1          │
                        │   Multi-Tenant      │
                        │   Organizations     │
                        │   + Database Schema │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
     │   SPRINT 2A     │  │   SPRINT 2B     │  │   SPRINT 2C    │
     │   Services      │  │   Staff         │  │   Customers    │
     │   Catalog       │  │   Management    │  │   Base         │
     └────────┬────────┘  └────────┬────────┘  └───────┬────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   SPRINT 3-4        │
                        │   Booking Engine    │
                        │   + Calendar        │
                        │   + Slot Management │
                        └──────────┬──────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
┌────────▼────────┐     ┌──────────▼──────────┐   ┌──────────▼──────────┐
│   SPRINT 5      │     │   SPRINT 6          │   │   SPRINT 7          │
│   Dashboard     │     │   Billing           │   │   Email             │
│   + Analytics   │     │   Polar.sh          │   │   Resend            │
│   + Calendar UI │     │   Subscriptions     │   │   Notifications     │
└────────┬────────┘     └──────────┬──────────┘   └──────────┬──────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                                        │
     ┌────────▼────────┐                    ┌──────────▼──────────┐
     │   SPRINT 8      │                    │   SPRINT 9          │
     │   Reports       │                    │   Customer Portal   │
     │   Advanced      │                    │   Self-Service      │
     │   Analytics     │                    │   Booking           │
     └─────────────────┘                    └─────────────────────┘
```

---

## Sprint 1: Multi-Tenant Foundation

> **Hedef:** Organizasyon yapisi ve database schema'nin kurulmasi
> **Bagimlili:** Auth (✅ Done)
> **User Stories:** US-001, US-030

### Gorevler

#### Backend (Convex)

| Gorev | Dosya | Oncelik |
|-------|-------|---------|
| Tam database schema olustur | `convex/schema.ts` | P0 |
| Organization CRUD mutations | `convex/organizations.ts` | P0 |
| Organization queries | `convex/organizations.ts` | P0 |
| RLS (Row-Level Security) setup | `convex/lib/rls.ts` | P0 |
| Onboarding mutation | `convex/onboarding.ts` | P0 |

#### Frontend (Next.js)

| Gorev | Dosya | Oncelik |
|-------|-------|---------|
| Onboarding wizard page | `src/app/onboarding/page.tsx` | P0 |
| Organization setup form | `src/modules/onboarding/` | P0 |
| Business hours selector | `src/components/business-hours/` | P0 |
| Protected route middleware | `src/middleware.ts` | P0 |
| Organization context provider | `src/modules/organization/` | P0 |

### Schema Tables (Sprint 1)

```typescript
// Bu sprint'te olusturulacak tablolar:
- organizations
- staff (owner record)
- serviceCategories
- bookingSettings (org icinde)
```

### Deliverables

- [ ] Yeni kullanici kayit oldugunda onboarding'e yonlendirme
- [ ] Salon bilgileri formu (isim, adres, iletisim)
- [ ] Calisma saatleri secimi
- [ ] Owner olarak staff kaydinin otomatik olusturulmasi
- [ ] Dashboard'a yonlendirme

### Definition of Done

1. Kullanici sign-in sonrasi onboarding wizard'i goruyor
2. Salon bilgilerini girebiliyor
3. Calisma saatlerini ayarlayabiliyor
4. Tamamladiktan sonra dashboard'a gidiyor
5. Organization data Convex'te saklanmis oluyor

---

## Sprint 2: Services, Staff & Customers

> **Hedef:** Temel entity'lerin yonetimi
> **Bagimlilik:** Sprint 1 (Organizations)
> **User Stories:** US-002, US-003, US-006

### 2A: Service Catalog

#### Backend

| Gorev | Dosya |
|-------|-------|
| Service CRUD mutations | `convex/services.ts` |
| Category CRUD mutations | `convex/serviceCategories.ts` |
| Service queries (by org, by category) | `convex/services.ts` |

#### Frontend

| Gorev | Dosya |
|-------|-------|
| Services list page | `src/app/[org]/services/page.tsx` |
| Service form (add/edit) | `src/modules/services/` |
| Category management | `src/modules/services/categories/` |
| Price formatter (TRY) | `src/lib/currency.ts` |

### 2B: Staff Management

#### Backend

| Gorev | Dosya |
|-------|-------|
| Staff CRUD mutations | `convex/staff.ts` |
| Invitation mutation | `convex/staff.ts` |
| Role permission helpers | `convex/lib/permissions.ts` |
| Schedule queries | `convex/schedules.ts` |

#### Frontend

| Gorev | Dosya |
|-------|-------|
| Staff list page | `src/app/[org]/staff/page.tsx` |
| Staff profile page | `src/app/[org]/staff/[id]/page.tsx` |
| Invite staff modal | `src/modules/staff/InviteModal.tsx` |
| Schedule editor | `src/modules/staff/ScheduleEditor.tsx` |
| Role badge component | `src/components/RoleBadge.tsx` |

### 2C: Customer Base

#### Backend

| Gorev | Dosya |
|-------|-------|
| Customer CRUD mutations | `convex/customers.ts` |
| Customer search query | `convex/customers.ts` |
| Phone validation helper | `convex/lib/phone.ts` |

#### Frontend

| Gorev | Dosya |
|-------|-------|
| Customer list page | `src/app/[org]/customers/page.tsx` |
| Customer profile page | `src/app/[org]/customers/[id]/page.tsx` |
| Customer search component | `src/modules/customers/Search.tsx` |

### Deliverables

- [ ] Hizmet katalogu CRUD (kategori, hizmet, fiyat, sure)
- [ ] Staff davet sistemi (email)
- [ ] Staff rol yonetimi (owner, admin, staff)
- [ ] Staff calisma saati ayarlari
- [ ] Musteri listesi ve arama
- [ ] Musteri profil sayfasi

---

## Sprint 3: Booking Engine - Core

> **Hedef:** Randevu olusturma ve slot yonetimi
> **Bagimlilik:** Sprint 2 (Services, Staff, Customers)
> **User Stories:** US-020, US-021, US-022, US-031

### Backend

| Gorev | Dosya | Oncelik |
|-------|-------|---------|
| Slot availability algorithm | `convex/slots.ts` | P0 |
| Slot lock mechanism | `convex/slotLocks.ts` | P0 |
| Appointment CRUD | `convex/appointments.ts` | P0 |
| Appointment services junction | `convex/appointmentServices.ts` | P0 |
| Lock cleanup cron job | `convex/crons.ts` | P0 |
| Confirmation code generator | `convex/lib/confirmation.ts` | P0 |

### Frontend

| Gorev | Dosya | Oncelik |
|-------|-------|---------|
| Service selector component | `src/modules/booking/ServiceSelector.tsx` | P0 |
| Staff selector component | `src/modules/booking/StaffSelector.tsx` | P0 |
| Date picker component | `src/modules/booking/DatePicker.tsx` | P0 |
| Time slot grid | `src/modules/booking/TimeSlotGrid.tsx` | P0 |
| Booking summary | `src/modules/booking/Summary.tsx` | P0 |
| useAvailableSlots hook | `src/modules/booking/hooks/` | P0 |

### Slot Availability Logic

```typescript
// Algoritma ozeti:
1. Secilen hizmetlerin toplam suresini hesapla
2. Secilen gun icin calisan staff'lari bul
3. Her staff icin:
   - Calisma saatlerini al
   - Mevcut randevulari cikar
   - Aktif lock'lari cikar
   - Uygun boşluklari hesapla
4. 15 dakikalik slotlar olarak dondur
5. Ayni anda guncelleme icin real-time subscription
```

### Deliverables

- [ ] Hizmet secimi (coklu secim destegi)
- [ ] Staff secimi (veya "herhangi biri")
- [ ] Tarih secimi (30 gun ileri)
- [ ] Uygun slot gosterimi
- [ ] Slot kilitleme (2 dakika TTL)
- [ ] Real-time slot guncellemesi

---

## Sprint 4: Booking Engine - Operations

> **Hedef:** Randevu yonetimi ve islemleri
> **Bagimlilik:** Sprint 3 (Booking Core)
> **User Stories:** US-010, US-011, US-012, US-014, US-015, US-025

### Backend

| Gorev | Dosya |
|-------|-------|
| Check-in mutation | `convex/appointments.ts` |
| Checkout mutation | `convex/appointments.ts` |
| Cancel mutation | `convex/appointments.ts` |
| No-show mutation | `convex/appointments.ts` |
| Walk-in quick booking | `convex/appointments.ts` |
| OTP verification | `convex/otp.ts` |
| Reschedule mutation | `convex/appointments.ts` |

### Frontend

| Gorev | Dosya |
|-------|-------|
| Booking flow wizard | `src/app/[org]/book/page.tsx` |
| Customer info form | `src/modules/booking/CustomerForm.tsx` |
| OTP input component | `src/modules/booking/OTPInput.tsx` |
| Confirmation page | `src/app/[org]/book/confirmation/[id]/page.tsx` |
| Walk-in quick form | `src/modules/booking/WalkInForm.tsx` |
| Appointment detail modal | `src/modules/appointments/DetailModal.tsx` |
| Status badges | `src/components/AppointmentStatus.tsx` |

### Appointment States

```
pending -> confirmed -> checked_in -> completed
                    \-> cancelled
                    \-> no_show
```

### Deliverables

- [ ] Online booking wizard (7 adim)
- [ ] OTP dogrulama
- [ ] Booking onay sayfasi
- [ ] Walk-in hizli form
- [ ] Check-in islemi
- [ ] Checkout islemi
- [ ] Iptal islemi (2 saat kurali)
- [ ] No-show isaretleme
- [ ] Yeniden planlama

---

## Sprint 5: Admin Dashboard & Calendar

> **Hedef:** Yonetim paneli ve takvim gorunumleri
> **Bagimlilik:** Sprint 4 (Booking Operations)
> **User Stories:** US-004, US-010

### Backend

| Gorev | Dosya |
|-------|-------|
| Dashboard metrics query | `convex/analytics.ts` |
| Calendar appointments query | `convex/appointments.ts` |
| Notifications queries | `convex/notifications.ts` |
| Real-time subscriptions | Tum ilgili dosyalar |

### Frontend

| Gorev | Dosya |
|-------|-------|
| Dashboard layout | `src/app/[org]/layout.tsx` |
| Sidebar navigation | `src/components/Sidebar.tsx` |
| Metrics cards | `src/modules/dashboard/MetricsCard.tsx` |
| Today's schedule widget | `src/modules/dashboard/TodaySchedule.tsx` |
| Quick actions | `src/modules/dashboard/QuickActions.tsx` |
| Notification bell | `src/components/NotificationBell.tsx` |
| Calendar day view | `src/modules/calendar/DayView.tsx` |
| Calendar week view | `src/modules/calendar/WeekView.tsx` |
| Drag-drop rescheduling | `src/modules/calendar/DragDrop.tsx` |

### Dashboard Metrics

```typescript
interface DashboardMetrics {
  today: {
    totalAppointments: number;
    completed: number;
    upcoming: number;
    noShows: number;
    walkIns: number;
  };
  thisWeek: {
    totalBookings: number;
    percentChange: number;
  };
  thisMonth: {
    revenue: number;
    percentChange: number;
    averageTicket: number;
  };
}
```

### Deliverables

- [ ] Dashboard ana sayfasi
- [ ] Sidebar navigasyon
- [ ] Gunluk metrikler
- [ ] Bugunku randevular listesi
- [ ] Hizli aksiyonlar (yeni randevu, walk-in, blok)
- [ ] Bildirim paneli
- [ ] Takvim gun gorunumu
- [ ] Takvim hafta gorunumu
- [ ] Drag-drop yeniden planlama
- [ ] Randevu detay modal

---

## Sprint 6: SaaS Billing (Polar.sh)

> **Hedef:** Abonelik sistemi entegrasyonu
> **Bagimlilik:** Sprint 5 (Dashboard)
> **User Stories:** US-040, US-041, US-042, US-043, US-044, US-045

### Backend

| Gorev | Dosya |
|-------|-------|
| Polar webhook handler | `convex/http.ts` |
| Subscription mutations | `convex/subscriptions.ts` |
| Subscription queries | `convex/subscriptions.ts` |
| Grace period logic | `convex/subscriptions.ts` |
| Checkout URL action | `convex/polar.ts` |
| Portal URL action | `convex/polar.ts` |

### Frontend

| Gorev | Dosya |
|-------|-------|
| Billing page | `src/app/[org]/billing/page.tsx` |
| Subscription status widget | `src/modules/billing/StatusWidget.tsx` |
| Payment warning banner | `src/modules/billing/WarningBanner.tsx` |
| Billing history table | `src/modules/billing/HistoryTable.tsx` |
| Subscription middleware | `src/middleware.ts` |

### Polar.sh Integration

```typescript
// Webhook events:
- checkout.completed -> subscription.created
- subscription.updated
- subscription.cancelled
- payment.succeeded
- payment.failed -> grace period baslatir

// Grace period: 7 gun
// Day 1, 3, 5, 7: Hatirlatma email'leri
// Day 7 sonrasi: Account suspended
```

### Deliverables

- [ ] Checkout flow (monthly/yearly secimi)
- [ ] Abonelik durum widget'i
- [ ] Odeme hatasi banner'i
- [ ] Grace period yonetimi
- [ ] Fatura gecmisi
- [ ] Polar portal yonlendirmesi
- [ ] Abonelik iptali
- [ ] Suspended durum yonetimi (sadece billing sayfasi erisimi)

---

## Sprint 7: Email Notifications (Resend)

> **Hedef:** Email bildirim sistemi
> **Bagimlilik:** Sprint 4 (Booking), Sprint 6 (Billing)
> **User Stories:** US-023, US-024

### Backend

| Gorev | Dosya |
|-------|-------|
| Resend action | `convex/email.ts` |
| Email templates | `convex/emailTemplates.ts` |
| Reminder scheduler | `convex/schedulers.ts` |
| Reminder cron job | `convex/crons.ts` |

### Frontend (React Email Templates)

| Gorev | Dosya |
|-------|-------|
| Booking confirmation email | `src/emails/BookingConfirmation.tsx` |
| Reminder email | `src/emails/Reminder.tsx` |
| Cancellation email | `src/emails/Cancellation.tsx` |
| Staff invitation email | `src/emails/StaffInvitation.tsx` |
| Payment failed email | `src/emails/PaymentFailed.tsx` |

### Email Types

| Email | Trigger | Timing |
|-------|---------|--------|
| Booking Confirmation | Randevu olusturulunca | Aninda |
| Reminder | Scheduler | 24 saat once |
| Cancellation | Iptal edilince | Aninda |
| Staff Invitation | Davet gonderilince | Aninda |
| Payment Failed | Odeme basarisiz | Aninda |
| Grace Period Reminders | Cron | Day 1, 3, 5, 7 |

### Deliverables

- [ ] Resend entegrasyonu
- [ ] React Email template'leri
- [ ] Booking confirmation email
- [ ] 24 saat oncesi hatirlatma
- [ ] Iptal bildirimi
- [ ] Staff davet email'i
- [ ] Odeme hatasi email'leri
- [ ] ICS takvim eki

---

## Sprint 8: Reports & Analytics (P1)

> **Hedef:** Detayli raporlama sistemi
> **Bagimlilik:** Sprint 5 (Dashboard)
> **User Stories:** US-005, US-032

### Backend

| Gorev | Dosya |
|-------|-------|
| Revenue report query | `convex/reports.ts` |
| Staff performance query | `convex/reports.ts` |
| Customer analytics query | `convex/reports.ts` |
| Audit log mutations | `convex/auditLogs.ts` |
| CSV export action | `convex/exports.ts` |

### Frontend

| Gorev | Dosya |
|-------|-------|
| Reports layout | `src/app/[org]/reports/layout.tsx` |
| Revenue report page | `src/app/[org]/reports/revenue/page.tsx` |
| Staff report page | `src/app/[org]/reports/staff/page.tsx` |
| Customer report page | `src/app/[org]/reports/customers/page.tsx` |
| Chart components | `src/modules/reports/charts/` |
| Date range picker | `src/components/DateRangePicker.tsx` |
| Export button | `src/components/ExportButton.tsx` |

### Report Types

| Rapor | Metrikler |
|-------|-----------|
| Revenue | Gunluk/haftalik/aylik gelir, hizmet bazli, staff bazli |
| Staff Performance | Randevu sayisi, gelir, utilization %, no-show orani |
| Customer Analytics | Yeni vs donen, retention, top customers |

### Deliverables

- [ ] Gelir raporu (grafik + tablo)
- [ ] Staff performans raporu
- [ ] Musteri analitik raporu
- [ ] Tarih araligi secici
- [ ] CSV export
- [ ] Audit logging

---

## Sprint 9: Customer Portal (P1)

> **Hedef:** Musteri self-servis portali
> **Bagimlilik:** Sprint 4 (Booking), Sprint 7 (Email)
> **User Stories:** US-026, US-027

### Backend

| Gorev | Dosya |
|-------|-------|
| Customer auth (magic link) | `convex/customerAuth.ts` |
| Customer booking history | `convex/customers.ts` |
| Reschedule mutation | `convex/appointments.ts` |
| Cancel (customer) mutation | `convex/appointments.ts` |

### Frontend

| Gorev | Dosya |
|-------|-------|
| Customer portal layout | `src/app/[org]/portal/layout.tsx` |
| Login page (magic link) | `src/app/[org]/portal/login/page.tsx` |
| My appointments page | `src/app/[org]/portal/appointments/page.tsx` |
| Booking history | `src/app/[org]/portal/history/page.tsx` |
| Reschedule flow | `src/app/[org]/portal/reschedule/[id]/page.tsx` |
| Cancel confirmation | `src/modules/portal/CancelModal.tsx` |

### Customer Portal Features

```
Portal Ana Sayfa
├── Aktif Randevular
│   ├── Detay Goruntule
│   ├── Yeniden Planla
│   └── Iptal Et
├── Gecmis Randevular
│   └── Tekrar Rezerve Et
└── Profil Ayarlari
    ├── Iletisim Bilgileri
    └── Bildirim Tercihleri
```

### Deliverables

- [ ] Magic link authentication
- [ ] Aktif randevular listesi
- [ ] Gecmis randevular
- [ ] Self-service yeniden planlama
- [ ] Self-service iptal (2 saat kurali)
- [ ] "Tekrar rezerve et" butonu
- [ ] Bildirim tercihleri

---

## Sprint Ozet Tablosu

| Sprint | Hedef | User Stories | Tahmini Complexity |
|--------|-------|--------------|-------------------|
| 1 | Multi-Tenant Foundation | US-001, US-030 | Medium |
| 2 | Services, Staff, Customers | US-002, US-003, US-006 | High |
| 3 | Booking Engine Core | US-020-022, US-031 | High |
| 4 | Booking Operations | US-010-015, US-025 | High |
| 5 | Dashboard & Calendar | US-004, US-010 | High |
| 6 | SaaS Billing | US-040-045 | Medium |
| 7 | Email Notifications | US-023, US-024 | Low |
| 8 | Reports & Analytics | US-005, US-032 | Medium |
| 9 | Customer Portal | US-026, US-027 | Medium |

---

## Risk ve Mitigasyon

| Risk | Etki | Olasilik | Mitigasyon |
|------|------|----------|------------|
| Slot locking race condition | High | Medium | Convex OCC + TTL |
| Polar webhook siralama | Medium | Low | Idempotent handlers |
| Email deliverability | Medium | Low | Resend reputation |
| Calendar performance | Medium | Medium | Pagination + virtualization |
| Multi-service booking complexity | High | Medium | Incremental implementation |

---

## Teknik Notlar

### Convex Best Practices

- Tum query'ler `organizationId` ile filtrelenmeli (RLS)
- Internal function'lar icin `internalMutation`, `internalQuery`
- Action'lar sadece external API call'lari icin
- Scheduler kullanarak async islemler

### Frontend Best Practices

- React Compiler aktif - manual memo kullanma
- TanStack Form + Zod validation
- Convex hooks ile real-time data
- Optimistic updates for better UX

### URL Yapisi

```
/                           # Landing
/sign-in                    # Auth
/onboarding                 # New user setup
/[org]/dashboard            # Admin dashboard
/[org]/calendar             # Calendar views
/[org]/staff                # Staff management
/[org]/services             # Service catalog
/[org]/customers            # Customer management
/[org]/reports              # Reports
/[org]/billing              # Subscription
/[org]/settings             # Settings
/[org]/book                 # Public booking (customer)
/[org]/portal               # Customer portal
```

---

## Sonraki Adimlar

Sprint 1'e baslamak icin:

1. `convex/schema.ts` dosyasini olustur
2. `bunx convex dev` ile type generation
3. Organization mutations/queries
4. Onboarding UI

> **Not:** Her sprint sonunda code review ve test yapilmali.
