// Components — new single-page booking design

// Legacy — files kept but BookingAccordion is broken after useBookingFlow refactor
export { AccordionPanel } from "./components/AccordionPanel";
// Components — dashboard/admin (not part of public booking page)
export { AppointmentList } from "./components/AppointmentList";
export { AppointmentStatusBadge } from "./components/AppointmentStatusBadge";
// Components — post-booking & shared
export { BookingConfirmation } from "./components/BookingConfirmation";
export { BookingForm } from "./components/BookingForm";
export { BookingPageHeader } from "./components/BookingPageHeader";
export { BookingSummary } from "./components/BookingSummary";
export { CancelAppointmentDialog } from "./components/CancelAppointmentDialog";
export { ConfirmBookingDialog } from "./components/ConfirmBookingDialog";
export { CreateAppointmentDialog } from "./components/CreateAppointmentDialog";
export { DatePicker } from "./components/DatePicker";
export { RescheduleDialog } from "./components/RescheduleDialog";
export { SalonSidebar } from "./components/SalonSidebar";
export { ServiceSelector } from "./components/ServiceSelector";
export { SlotLockCountdown } from "./components/SlotLockCountdown";
export { StaffSelector } from "./components/StaffSelector";
export { StickyBottomBar } from "./components/StickyBottomBar";
export { TimeSlotGrid } from "./components/TimeSlotGrid";
export { UpdateStatusDropdown } from "./components/UpdateStatusDropdown";
export { WeeklyDatePicker } from "./components/WeeklyDatePicker";

// Hooks
export { useBookingFlow } from "./hooks/useBookingFlow";

// Constants
export {
  BOOKING_PANELS,
  BOOKING_STEPS,
  formatMinutesAsTime,
  PANEL_LABELS,
  STEP_LABELS,
} from "./lib/constants";
