/**
 * SMS Verification Service
 *
 * Handles phone number verification via Twilio Verify.
 * This complements Supabase's built-in phone auth — use this for
 * standalone phone verification outside of the auth flow
 * (e.g., verifying a notification phone number).
 */

import { getTwilioClient, getVerifyServiceSid } from './client';
import type { VerificationResult } from './types';

/**
 * Send a verification code to a phone number.
 * @param phoneNumber - E.164 format (+1234567890)
 * @param channel - 'sms' or 'call'
 */
export async function sendVerification(
  phoneNumber: string,
  channel: 'sms' | 'call' = 'sms'
): Promise<VerificationResult> {
  try {
    const client = getTwilioClient();
    const serviceSid = getVerifyServiceSid();

    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel });

    return {
      success: true,
      status: verification.status,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Failed to send verification:', error);
    return { success: false, error };
  }
}

/**
 * Check a verification code.
 * @param phoneNumber - E.164 format (+1234567890)
 * @param code - The 6-digit code entered by the user
 */
export async function checkVerification(
  phoneNumber: string,
  code: string
): Promise<VerificationResult> {
  try {
    const client = getTwilioClient();
    const serviceSid = getVerifyServiceSid();

    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    return {
      success: check.status === 'approved',
      status: check.status,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Failed to check verification:', error);
    return { success: false, error };
  }
}
