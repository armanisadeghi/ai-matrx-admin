/**
 * Audio Fallback Upload Service
 *
 * When chunked transcription fails, this uploads the full audio blob
 * to Supabase Storage and then transcribes via the URL-based API route,
 * which supports up to 100 MB (Groq Developer Plan via URL).
 */

'use client';

import { supabase } from '@/utils/supabase/client';
import { AUDIO_API_ROUTES, RETRY_CONFIG } from '../constants';
import { TranscriptionResult, TranscriptionOptions } from '../types';

const STORAGE_BUCKET = 'user-private-assets';

function generatePath(userId: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).substring(2, 8);
  return `transcripts/fallback/${userId}/${ts}_${rand}.webm`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadWithRetry(
  blob: Blob,
  path: string,
  maxAttempts: number = RETRY_CONFIG.MAX_ATTEMPTS,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, {
          contentType: blob.type || 'audio/webm',
          upsert: false,
        });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Upload succeeded but returned no data');

      const { data: urlData, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 600);

      if (urlError || !urlData?.signedUrl) {
        throw new Error(urlError?.message || 'Failed to create signed URL');
      }

      return urlData.signedUrl;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const delay = Math.min(
          RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt - 1),
          RETRY_CONFIG.MAX_DELAY_MS,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Upload failed after retries');
}

export async function logClientError(entry: {
  errorCode: string;
  errorMessage: string;
  fileSizeBytes?: number;
  chunkIndex?: number;
  apiRoute?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch(AUDIO_API_ROUTES.LOG_ERROR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    console.error('[logClientError] Failed to report error to server');
  }
}

export async function uploadAndTranscribeFull(
  blob: Blob,
  userId: string,
  options?: TranscriptionOptions,
): Promise<TranscriptionResult> {
  const path = generatePath(userId);

  try {
    const signedUrl = await uploadWithRetry(blob, path);

    const body: Record<string, string> = { url: signedUrl };
    if (options?.language) body.language = options.language;
    if (options?.prompt) body.prompt = options.prompt;

    const response = await fetch(AUDIO_API_ROUTES.TRANSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = data.error || 'URL transcription failed';
      await logClientError({
        errorCode: `HTTP_${response.status}`,
        errorMessage: errorMsg,
        fileSizeBytes: blob.size,
        apiRoute: AUDIO_API_ROUTES.TRANSCRIBE_URL,
      });
      return { success: false, text: '', error: errorMsg };
    }

    return {
      success: true,
      text: data.text,
      language: data.language,
      duration: data.duration,
      segments: data.segments,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fallback transcription failed';
    await logClientError({
      errorCode: 'FALLBACK_FAILED',
      errorMessage: message,
      fileSizeBytes: blob.size,
      apiRoute: 'fallback-upload',
    });
    return { success: false, text: '', error: message };
  } finally {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    } catch {
      // Non-critical cleanup
    }
  }
}
