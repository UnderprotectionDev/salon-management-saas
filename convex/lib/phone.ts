// Turkish mobile phone format: +90 5XX XXX XX XX
const TURKISH_PHONE_REGEX = /^\+90 5\d{2} \d{3} \d{2} \d{2}$/;

export function isValidTurkishPhone(phone: string): boolean {
  return TURKISH_PHONE_REGEX.test(phone);
}

export function formatTurkishPhone(digits: string): string {
  // Strip all non-digit characters (including +)
  const cleaned = digits.replace(/\D/g, "");
  // 5XXXXXXXXX (10 digits, no country code)
  if (cleaned.length === 10 && cleaned.startsWith("5")) {
    return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  // 905XXXXXXXXX (12 digits with country code) — covers E.164 +905XXXXXXXXX
  if (cleaned.length === 12 && cleaned.startsWith("905")) {
    const d = cleaned.slice(2);
    return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  }
  // 05XXXXXXXXX (11 digits with leading zero)
  if (cleaned.length === 11 && cleaned.startsWith("05")) {
    const d = cleaned.slice(1);
    return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  }
  return digits;
}
