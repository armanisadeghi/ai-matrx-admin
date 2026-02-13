/**
 * POST /api/sms/send
 *
 * Send an outbound SMS message.
 * Requires authenticated user. Admin can send to any number.
 * Regular users can only send from their assigned numbers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { sendAndLogSms } from '@/lib/sms/send';
import { findOrCreateConversation } from '@/lib/sms/receive';

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
    const { to, message, conversationId, mediaUrl } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, msg: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Get user's assigned phone number for the 'from' field
    const { data: userNumber } = await adminSupabase
      .from('sms_phone_numbers')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    // Fall back to any available number if user doesn't have one assigned
    let fromNumber = userNumber?.phone_number;
    if (!fromNumber) {
      const { data: defaultNumber } = await adminSupabase
        .from('sms_phone_numbers')
        .select('phone_number')
        .eq('is_active', true)
        .is('user_id', null)
        .limit(1)
        .single();
      fromNumber = defaultNumber?.phone_number;
    }

    // Resolve or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await findOrCreateConversation(to, fromNumber || '');
      convId = conv.id;

      // If the conversation was created with no user, assign this user
      if (!conv.userId) {
        await adminSupabase
          .from('sms_conversations')
          .update({ user_id: user.id, conversation_type: 'user_initiated' })
          .eq('id', convId);
      }
    }

    const result = await sendAndLogSms({
      to,
      body: message,
      from: fromNumber || undefined,
      mediaUrl,
      conversationId: convId,
      sentByUserId: user.id,
      sentByType: 'user',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, msg: 'Failed to send SMS', error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      msg: 'SMS sent',
      data: { sid: result.sid, conversationId: convId },
    });
  } catch (err) {
    console.error('Error in SMS send route:', err);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
