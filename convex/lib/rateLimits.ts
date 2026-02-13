/**
 * Rate Limiting Configuration
 *
 * Projede kullanılan rate limit kuralları.
 * Token bucket: Burst'e izin verir, sonra yavaşlar
 * Fixed window: Belirli periyotta sabit limit
 */

import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

// Time constants
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Rate limiter instance with configured limits
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // ==========================================================================
  // Invitation Limits
  // ==========================================================================

  /**
   * Davet oluşturma limiti (organizasyon başına)
   * Günde max 20 davet, burst için 5 ekstra
   */
  createInvitation: {
    kind: "token bucket",
    rate: 20, // Günde 20 davet
    period: DAY,
    capacity: 25, // Burst için 5 ekstra
  },

  /**
   * Davet yeniden gönderme limiti (davet başına)
   * Saatte max 3 resend
   */
  resendInvitation: {
    kind: "token bucket",
    rate: 3,
    period: HOUR,
  },

  // ==========================================================================
  // Organization Limits
  // ==========================================================================

  /**
   * Organizasyon oluşturma limiti (kullanıcı başına)
   * Günde max 3 organizasyon
   */
  createOrganization: {
    kind: "fixed window",
    rate: 3,
    period: DAY,
  },

  // ==========================================================================
  // Member Limits
  // ==========================================================================

  /**
   * Üye ekleme limiti (organizasyon başına)
   * Saatte max 10 üye
   */
  addMember: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
    capacity: 15,
  },

  // ==========================================================================
  // Service Limits
  // ==========================================================================

  /**
   * Service creation limit (per organization)
   * 50 services per day, burst capacity of 60
   */
  createService: {
    kind: "token bucket",
    rate: 50,
    period: DAY,
    capacity: 60,
  },

  // ==========================================================================
  // Staff Schedule Limits
  // ==========================================================================

  /**
   * Schedule override oluşturma limiti (organizasyon başına)
   * Günde max 30 override, burst için 10 ekstra
   */
  createScheduleOverride: {
    kind: "token bucket",
    rate: 30,
    period: DAY,
    capacity: 40,
  },

  /**
   * İzin talebi oluşturma limiti (staff başına)
   * Günde max 5 talep
   */
  createTimeOffRequest: {
    kind: "fixed window",
    rate: 5,
    period: DAY,
  },

  /**
   * Mesai oluşturma limiti (staff başına)
   * Günde max 10, burst için 5 ekstra
   */
  createOvertime: {
    kind: "token bucket",
    rate: 10,
    period: DAY,
    capacity: 15,
  },

  // ==========================================================================
  // Customer Limits
  // ==========================================================================

  /**
   * Müşteri oluşturma limiti (organizasyon başına)
   * Saatte max 30, burst için 10 ekstra
   */
  createCustomer: {
    kind: "token bucket",
    rate: 30,
    period: HOUR,
    capacity: 40,
  },

  // ==========================================================================
  // Future: Booking Limits (ileride kullanılacak)
  // ==========================================================================

  /**
   * Randevu oluşturma limiti (kullanıcı başına)
   * Dakikada max 5 randevu
   */
  createBooking: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 10,
  },

  /**
   * Slot lock acquisition limit (per user)
   * 10 per minute
   */
  acquireSlotLock: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
  },

  /**
   * Confirmation code lookup limit (per organization)
   * 10 per minute
   */
  confirmationCodeLookup: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
  },

  /**
   * Randevu iptal limiti (kullanıcı başına)
   * Saatte max 3 iptal
   */
  cancelBooking: {
    kind: "token bucket",
    rate: 3,
    period: HOUR,
  },

  /**
   * Randevu yeniden planlama limiti
   * Saatte max 3 yeniden planlama
   */
  rescheduleBooking: {
    kind: "token bucket",
    rate: 3,
    period: HOUR,
  },

  // ==========================================================================
  // Subscription Limits
  // ==========================================================================

  /**
   * Subscription cancellation limit (per organization)
   * 3 per hour
   */
  cancelSubscription: {
    kind: "token bucket",
    rate: 3,
    period: HOUR,
  },

  // ==========================================================================
  // SuperAdmin Limits
  // ==========================================================================

  suspendOrganization: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
  },

  deleteOrganization: {
    kind: "fixed window",
    rate: 5,
    period: DAY,
  },

  banUser: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
  },

  // ==========================================================================
  // Account Deletion
  // ==========================================================================

  /**
   * Account deletion limit (per user)
   * 1 per day — prevents accidental rapid re-creation/deletion
   */
  deleteAccount: {
    kind: "fixed window",
    rate: 1,
    period: DAY,
  },
});

// Re-export time constants for use elsewhere
export { SECOND, MINUTE, HOUR, DAY };
