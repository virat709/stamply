// Builds a one-tap WhatsApp chat link from a raw phone field.
// Returns null when the number isn't usable for wa.me (needs 8+ digits).
export function whatsappLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
