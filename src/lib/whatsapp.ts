// Builds a one-tap WhatsApp chat link from a raw phone field.
// Returns null when the number isn't usable for wa.me (needs 8+ digits).

export function whatsappDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function whatsappLink(phone: string): string | null {
  const digits = whatsappDigits(phone);
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
