/**
 * Twilio Webhook Signature Validation
 *
 * Validates X-Twilio-Signature headers on incoming webhook requests.
 * Critical for security — prevents spoofed webhook calls.
 */

import twilio from 'twilio';
import { getAuthToken, getAppBaseUrl } from './client';

/**
 * Validate a Twilio webhook request signature.
 *
 * @param signature - The X-Twilio-Signature header value
 * @param url - The full URL of the webhook endpoint
 * @param params - The POST body parameters as a key-value object
 * @returns true if the signature is valid
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Skip validation in development/test
  if (process.env.NODE_ENV === 'development' && process.env.TWILIO_SKIP_VALIDATION === 'true') {
    console.warn('Twilio signature validation skipped (development mode)');
    return true;
  }

  const authToken = getAuthToken();
  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Extract and validate a Twilio webhook from a NextRequest.
 * Handles Vercel's SSL termination by reconstructing the original URL.
 *
 * @param request - The incoming request
 * @param pathname - The route pathname (e.g., '/api/webhooks/twilio/sms')
 * @returns Object with validation result and parsed params
 */
export async function validateTwilioWebhook(
  request: Request,
  pathname: string
): Promise<{
  valid: boolean;
  params: Record<string, string>;
  error?: string;
}> {
  try {
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) {
      return { valid: false, params: {}, error: 'Missing X-Twilio-Signature header' };
    }

    // Parse the URL-encoded body
    const body = await request.text();
    const urlParams = new URLSearchParams(body);
    const params: Record<string, string> = {};
    urlParams.forEach((value, key) => {
      params[key] = value;
    });

    // Reconstruct the full URL, handling Vercel's SSL termination
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || new URL(getAppBaseUrl()).host;
    const url = `${proto}://${host}${pathname}`;

    const valid = validateTwilioSignature(signature, url, params);

    if (!valid) {
      return { valid: false, params, error: 'Invalid webhook signature' };
    }

    return { valid: true, params };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { valid: false, params: {}, error };
  }
}
