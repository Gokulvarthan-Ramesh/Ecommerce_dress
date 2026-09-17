/**
 * Cleans and standardizes Indian phone numbers into 10-digit format
 */
export function cleanIndianPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * Standardizes to international E.164 without plus for WhatsApp API: 919876543210
 */
export function formatWhatsAppNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  return cleaned;
}
