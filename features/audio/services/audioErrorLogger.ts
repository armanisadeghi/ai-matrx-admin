/**
 * Audio Transcription Error Logger
 *
 * Logs transcription errors to Supabase for post-mortem analysis.
 * Server-side: direct insert via admin client (bypasses RLS).
 * Client-side: POST to /api/audio/log-error.
 */

import { createAdminClient } from '@/utils/supabase/adminClient';

export interface TranscriptionErrorLog {
  userId: string;
  errorCode: string;
  errorMessage: string;
  fileSizeBytes: number;
  chunkIndex?: number;
  attemptNumber: number;
  apiRoute: string;
  metadata?: Record<string, unknown>;
}

/**
 * Server-side error logging — call from API routes.
 * Fails silently to avoid cascading errors during transcription.
 */
export async function logTranscriptionError(entry: TranscriptionErrorLog): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from('audio_transcription_errors').insert({
      user_id: entry.userId,
      error_code: entry.errorCode,
      error_message: entry.errorMessage.slice(0, 2000),
      file_size_bytes: entry.fileSizeBytes,
      chunk_index: entry.chunkIndex ?? null,
      attempt_number: entry.attemptNumber,
      api_route: entry.apiRoute,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error('[audioErrorLogger] Failed to log transcription error:', err);
  }
}
