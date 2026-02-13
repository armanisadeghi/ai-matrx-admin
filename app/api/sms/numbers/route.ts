/**
 * GET /api/sms/numbers
 * POST /api/sms/numbers
 *
 * Phone number management for SMS.
 * Admin-only operations (purchase, assign, release).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import {
  searchAvailableNumbers,
  purchasePhoneNumber,
  assignPhoneNumberToUser,
  releasePhoneNumber,
  listPhoneNumbers,
} from '@/lib/sms/numbers';

/**
 * GET /api/sms/numbers
 * List phone numbers. Users see their own, admins see all.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, msg: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Search for available numbers to purchase
    if (action === 'search') {
      const areaCode = searchParams.get('areaCode') || undefined;
      const country = searchParams.get('country') || 'US';

      const numbers = await searchAvailableNumbers({ areaCode, country });

      return NextResponse.json({
        success: true,
        msg: 'Available numbers fetched',
        data: numbers,
      });
    }

    // List owned numbers
    const numbers = await listPhoneNumbers({ userId: user.id, isActive: true });

    return NextResponse.json({
      success: true,
      msg: 'Phone numbers fetched',
      data: numbers,
    });
  } catch (err) {
    console.error('Error in numbers GET:', err);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sms/numbers
 * Purchase, assign, or release phone numbers.
 */
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
    const { action } = body;

    switch (action) {
      case 'purchase': {
        const { phoneNumber, friendlyName } = body;
        if (!phoneNumber) {
          return NextResponse.json(
            { success: false, msg: 'Missing phoneNumber' },
            { status: 400 }
          );
        }

        const result = await purchasePhoneNumber(phoneNumber, user.id, friendlyName);

        if (!result.success) {
          return NextResponse.json(
            { success: false, msg: 'Failed to purchase number', error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          msg: 'Phone number purchased',
          data: result.data,
        });
      }

      case 'assign': {
        const { phoneNumberId, userId: assignToUserId } = body;
        if (!phoneNumberId) {
          return NextResponse.json(
            { success: false, msg: 'Missing phoneNumberId' },
            { status: 400 }
          );
        }

        const result = await assignPhoneNumberToUser(
          phoneNumberId,
          assignToUserId || user.id
        );

        if (!result.success) {
          return NextResponse.json(
            { success: false, msg: 'Failed to assign number', error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          msg: 'Phone number assigned',
        });
      }

      case 'release': {
        const { phoneNumberId } = body;
        if (!phoneNumberId) {
          return NextResponse.json(
            { success: false, msg: 'Missing phoneNumberId' },
            { status: 400 }
          );
        }

        const result = await releasePhoneNumber(phoneNumberId);

        if (!result.success) {
          return NextResponse.json(
            { success: false, msg: 'Failed to release number', error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          msg: 'Phone number released',
        });
      }

      default:
        return NextResponse.json(
          { success: false, msg: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('Error in numbers POST:', err);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
