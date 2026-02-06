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
   * Randevu iptal limiti (kullanıcı başına)
   * Saatte max 3 iptal
   */
  cancelBooking: {
    kind: "token bucket",
    rate: 3,
    period: HOUR,
  },
});

// Re-export time constants for use elsewhere
export { SECOND, MINUTE, HOUR, DAY };
