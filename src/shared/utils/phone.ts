import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalize a customer's phone to the number WhatsApp dials: `+` then digits.
 * Argentine mobiles need the `9` after the country code, whether the customer
 * wrote it, wrote `15` instead, or left both out.
 * Returns null when the number isn't valid.
 */
export function toWhatsAppPhone(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw, 'AR');
  if (!parsed || !parsed.isValid()) {
    return null;
  }

  if (parsed.country === 'AR') {
    const national = parsed.nationalNumber;
    return national.startsWith('9') ? `+54${national}` : `+549${national}`;
  }

  return parsed.number;
}
