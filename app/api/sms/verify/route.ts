/**
 * POST /api/sms/verify
 *
 * Phone number verification via Twilio Verify.
 * Used to verify a user's notification phone number
 * (separate from Supabase auth phone login).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { sendVerification, checkVerification } from '@/lib/sms/verify';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, msg: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, phoneNumber, code } = body;

    if (!action || !phoneNumber) {
      return NextResponse.json(
        { success: false, msg: 'Missing required fields: action, phoneNumber' },
        { status: 400 }
      );
    }

    // Basic E.164 format validation
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, msg: 'Phone number must be in E.164 format (e.g., +12125551234)' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'send': {
        const result = await sendVerification(phoneNumber);

        if (!result.success) {
          return NextResponse.json(
            { success: false, msg: 'Failed to send verification', error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          msg: 'Verification code sent',
          data: { status: result.status },
        });
      }

      case 'check': {
        if (!code) {
          return NextResponse.json(
            { success: false, msg: 'Missing verification code' },
            { status: 400 }
          );
        }

        const result = await checkVerification(phoneNumber, code);

        if (!result.success) {
          return NextResponse.json(
            { success: false, msg: 'Verification failed', error: result.error },
            { status: 400 }
          );
        }

        // Phone verified — update user's notification preferences
        const adminSupabase = createAdminClient();

        await adminSupabase
          .from('sms_notification_preferences')
          .upsert(
            {
              user_id: user.id,
              phone_number: phoneNumber,
              sms_enabled: true,
            },
            { onConflict: 'user_id' }
          );

        // Create consent record
        await adminSupabase.from('sms_consent').upsert(
          {
            phone_number: phoneNumber,
            user_id: user.id,
            consent_type: 'transactional',
            status: 'opted_in',
            opted_in_at: new Date().toISOString(),
            opt_in_method: 'web_form',
          },
          { onConflict: 'phone_number,consent_type' }
        );

        return NextResponse.json({
          success: true,
          msg: 'Phone number verified and SMS notifications enabled',
          data: { status: result.status, phoneNumber },
        });
      }

      default:
        return NextResponse.json(
          { success: false, msg: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('Error in verify route:', err);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
