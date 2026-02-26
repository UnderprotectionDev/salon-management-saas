/**
 * Shared constants for backend business logic.
 * Keeps magic numbers named and centralized.
 */

// -- Appointment limits --
export const MAX_SERVICES_PER_APPOINTMENT = 10;
export const MAX_CUSTOMER_NOTES_LENGTH = 500;

// -- Query result limits --
export const MAX_NOTIFICATIONS_PER_PAGE = 50;
export const MAX_USER_APPOINTMENTS = 100;
export const MAX_CUSTOMER_SEARCH_RESULTS = 10;
export const DEFAULT_CUSTOMER_LIST_LIMIT = 200;
export const MAX_CUSTOMER_LIST_LIMIT = 500;
export const DEFAULT_APPOINTMENT_LIST_LIMIT = 50;
export const MAX_APPOINTMENT_LIST_LIMIT = 200;

// -- Time boundaries (minutes from midnight) --
export const MIN_BOOKING_HOUR_MINUTES = 360; // 06:00
export const MAX_BOOKING_HOUR_MINUTES = 1320; // 22:00

// -- Date format regex --
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
