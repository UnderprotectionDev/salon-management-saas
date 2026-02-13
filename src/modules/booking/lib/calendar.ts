/**
 * Calendar integration utilities for booking confirmations.
 * Generates ICS files and Google Calendar URLs.
 */

type CalendarEventParams = {
  date: string; // "YYYY-MM-DD"
  startTime: number; // minutes from midnight
  endTime: number; // minutes from midnight
  staffName: string;
  services: string[];
  confirmationCode: string;
  organizationName: string;
};

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
}

function formatICSDate(date: string, minutes: number): string {
  // Format: YYYYMMDDTHHMMSS (local time)
  const datePart = date.replace(/-/g, "");
  const timePart = `${minutesToHHMM(minutes)}00`;
  return `${datePart}T${timePart}`;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Generate an ICS (iCalendar) file content for the appointment.
 */
export function generateICS(params: CalendarEventParams): string {
  const {
    date,
    startTime,
    endTime,
    staffName,
    services,
    confirmationCode,
    organizationName,
  } = params;

  const dtStart = formatICSDate(date, startTime);
  const dtEnd = formatICSDate(date, endTime);
  const summary = escapeICSText(`${services.join(", ")} - ${organizationName}`);
  const description = escapeICSText(
    `Staff: ${staffName}\\nServices: ${services.join(", ")}\\nConfirmation Code: ${confirmationCode}`,
  );
  const location = escapeICSText(organizationName);
  const uid = `${confirmationCode}@salon-booking`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salon Management//Booking//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // VTIMEZONE for Europe/Istanbul (permanent UTC+3 since 2016)
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Istanbul",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:TRT",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Istanbul:${dtStart}`,
    `DTEND;TZID=Europe/Istanbul:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Generate a Google Calendar URL for the appointment.
 */
export function generateGoogleCalendarURL(params: CalendarEventParams): string {
  const {
    date,
    startTime,
    endTime,
    staffName,
    services,
    confirmationCode,
    organizationName,
  } = params;

  const title = `${services.join(", ")} - ${organizationName}`;
  const details = `Staff: ${staffName}\nConfirmation Code: ${confirmationCode}`;
  const location = organizationName;

  // Google Calendar uses UTC format: YYYYMMDDTHHMMSSZ
  // But we use timezone-aware local time format: YYYYMMDDTHHMMSS
  const dtStart = formatICSDate(date, startTime);
  const dtEnd = formatICSDate(date, endTime);

  const params_obj = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details,
    location,
    ctz: "Europe/Istanbul",
  });

  return `https://calendar.google.com/calendar/render?${params_obj.toString()}`;
}
