/**
 * URL-based Audio Transcription API Route
 *
 * For audio files > 4.5 MB that cannot be POSTed directly through Vercel.
 * Client uploads the file to Supabase Storage, then passes the signed URL here.
 * Groq Developer Plan supports up to 100 MB via URL parameter.
 */

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { resolveUser } from "@/utils/supabase/resolveUser";
import { logTranscriptionError } from "@/features/audio/services/audioErrorLogger";
import { filterWhisperHallucinations } from "@/features/audio/utils/hallucinationFilter";

export const maxDuration = 300;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const MAX_RETRIES = 3;
const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryable(status: number): boolean {
  return RETRYABLE_CODES.has(status);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function transcribeUrlWithRetry(
  options: Record<string, unknown>,
  userId: string,
): Promise<{ data: unknown; attempts: number }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await groq.audio.transcriptions.create(options as never);
      return { data: result, attempts: attempt };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as { status?: number })?.status;
      const retryAfter = (
        err as { headers?: { get?: (k: string) => string | null } }
      )?.headers?.get?.("retry-after");

      await logTranscriptionError({
        userId,
        errorCode: status ? `HTTP_${status}` : "SDK_ERROR",
        errorMessage: lastError.message,
        fileSizeBytes: 0,
        attemptNumber: attempt,
        apiRoute: "/api/audio/transcribe-url",
        metadata: {
          retryAfter,
          willRetry:
            attempt < MAX_RETRIES && (status ? isRetryable(status) : true),
        },
      });

      if (attempt < MAX_RETRIES && (status ? isRetryable(status) : true)) {
        const baseDelay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : 1000 * Math.pow(2, attempt - 1);
        const delay = Math.min(baseDelay, 8000);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("URL transcription failed after retries");
}

export async function POST(request: NextRequest) {
  let userId = "anonymous";

  try {
    const { user } = await resolveUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required. Provide a session cookie or Bearer token.",
        },
        { status: 401 },
      );
    }
    userId = user.id;

    const body = await request.json();
    const { url, language, prompt } = body as {
      url?: string;
      language?: string;
      prompt?: string;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: 'Missing or invalid "url" parameter' },
        { status: 400 },
      );
    }

    if (!url.startsWith(SUPABASE_URL)) {
      return NextResponse.json(
        { error: "URL must point to our Supabase Storage domain" },
        { status: 400 },
      );
    }

    const transcriptionOptions: Record<string, unknown> = {
      url,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      temperature: 0.0,
    };

    if (language) transcriptionOptions.language = language;
    if (prompt) transcriptionOptions.prompt = prompt;

    const { data: transcription, attempts } = await transcribeUrlWithRetry(
      transcriptionOptions,
      userId,
    );

    const response = transcription as Record<string, unknown>;
    const rawText = (transcription as { text: string }).text ?? "";

    // Filter Whisper's well-known silence hallucinations using segment-level
    // confidence signals. See features/audio/utils/hallucinationFilter.ts.
    const filtered = filterWhisperHallucinations(rawText, response.segments);

    return NextResponse.json({
      success: true,
      text: filtered.text,
      language: response.language ?? null,
      duration: response.duration ?? null,
      segments: filtered.segments,
      _meta: {
        attempts,
        hallucinationsFiltered: filtered.droppedSegments.length,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const status = (error as { status?: number })?.status;

    console.error("[/api/audio/transcribe-url] Final failure:", err.message);

    if (status === 429) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "URL transcription failed",
        details: err.message,
        code: "TRANSCRIPTION_ERROR",
      },
      { status: 500 },
    );
  }
}
