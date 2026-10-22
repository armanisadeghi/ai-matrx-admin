/**
 * Phone number utilities for SMS integration
 * Handles US phone number normalization to E.164 format
 */

/**
 * Normalize a US phone number to E.164 format (+1XXXXXXXXXX)
 * 
 * Rules:
 * - If exactly 10 digits and doesn't start with "+", prepend "+1"
 * - If exactly 11 digits and starts with "1", prepend "+"
 * - If already starts with "+", return as-is
 * - Otherwise, return as-is (let Twilio validation handle it)
 * 
 * @param phoneNumber - Raw phone number input
 * @returns Normalized phone number in E.164 format
 * 
 * @example
 * normalizePhoneNumber('2125551234') // '+12125551234'
 * normalizePhoneNumber('12125551234') // '+12125551234'
 * normalizePhoneNumber('+12125551234') // '+12125551234'
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;

  // Remove all non-digit characters except leading +
  const cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');

  // Already in E.164 format
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Exactly 10 digits - US number without country code
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }

  // Exactly 11 digits starting with 1 - US number with country code but no +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Return as-is for other cases (international numbers, etc.)
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Validate if a phone number is in valid E.164 format
 * 
 * @param phoneNumber - Phone number to validate
 * @returns True if valid E.164 format
 */
export function isValidE164(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

/**
 * Format a phone number for display (US format)
 * 
 * @param phoneNumber - E.164 formatted phone number
 * @returns Formatted phone number (e.g., +1 (212) 555-1234)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';

  const cleaned = phoneNumber.replace(/\D/g, '');

  // US number
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const lineNumber = cleaned.slice(7);
    return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
  }

  // Return as-is if not US format
  return phoneNumber;
}

/**
 * Extract just the digits from a phone number
 * 
 * @param phoneNumber - Phone number with any formatting
 * @returns Digits only
 */
export function extractDigits(phoneNumber: string): string {
  if (!phoneNumber) return '';
  return phoneNumber.replace(/\D/g, '');
}

/**
 * A typed phone number as E.164, or null when it cannot be a real number.
 * The strict door for sign-in and anything that texts: a bare 10-digit number is
 * taken as US (+1); a number with a country code must start with "+" or "1".
 */
export function toE164Phone(phoneNumber: string): string | null {
  if (!phoneNumber || !phoneNumber.trim()) return null;
  const digits = extractDigits(phoneNumber);
  const hasPlus = phoneNumber.trim().startsWith('+');
  if (!hasPlus && digits.length !== 10 && !(digits.length === 11 && digits.startsWith('1'))) return null;
  const e164 = normalizePhoneNumber(phoneNumber);
  return isValidE164(e164) && digits.length >= 8 ? e164 : null;
}
