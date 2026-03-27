/**
 * Client-side Audio Error Logging Endpoint
 *
 * Lightweight endpoint for client hooks to report transcription errors
 * to the database without needing direct Supabase admin access.
 * Supports both cookie-based auth and Bearer token auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/utils/supabase/resolveUser';
import { logTranscriptionError } from '@/features/audio/services/audioErrorLogger';

export async function POST(request: NextRequest) {
  try {
    const { user } = await resolveUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      errorCode,
      errorMessage,
      fileSizeBytes = 0,
      chunkIndex,
      attemptNumber = 1,
      apiRoute = 'client',
      metadata,
    } = body as {
      errorCode: string;
      errorMessage: string;
      fileSizeBytes?: number;
      chunkIndex?: number;
      attemptNumber?: number;
      apiRoute?: string;
      metadata?: Record<string, unknown>;
    };

    if (!errorCode || !errorMessage) {
      return NextResponse.json({ error: 'errorCode and errorMessage are required' }, { status: 400 });
    }

    await logTranscriptionError({
      userId: user.id,
      errorCode,
      errorMessage,
      fileSizeBytes,
      chunkIndex,
      attemptNumber,
      apiRoute,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/audio/log-error] Failed:', err);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
