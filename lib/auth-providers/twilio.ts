/**
 * Twilio Auth Provider
 *
 * Re-exports verification functions from the SMS service layer
 * for use in auth flows. This file exists for backwards compatibility.
 */

export { sendVerification, checkVerification } from '@/lib/sms/verify';
