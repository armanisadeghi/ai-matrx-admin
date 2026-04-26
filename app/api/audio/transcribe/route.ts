/**
 * Audio Transcription API Route
 *
 * Authenticated server-side proxy for Groq Whisper transcription.
 * Accepts direct file uploads up to 4.5 MB (Vercel body limit).
 * For larger files, use /api/audio/transcribe-url with a Supabase signed URL.
 *
 * Includes retry with exponential backoff and structured error logging.
 */

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { resolveUser } from "@/utils/supabase/resolveUser";
import { logTranscriptionError } from "@/features/audio/services/audioErrorLogger";
import { filterWhisperHallucinations } from "@/features/audio/utils/hallucinationFilter";
import { extractErrorMessage } from "@/utils/errors";

export const maxDuration = 120;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_BODY_SIZE = 4.5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "audio/flac",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
];

const MAX_RETRIES = 3;
const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryable(status: number): boolean {
  return RETRYABLE_CODES.has(status);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function transcribeWithRetry(
  options: Record<string, unknown>,
  userId: string,
  fileSize: number,
): Promise<{ data: unknown; attempts: number }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await groq.audio.transcriptions.create(options as never);
      return { data: result, attempts: attempt };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(extractErrorMessage(err));
      const status = (err as { status?: number })?.status;
      const retryAfter = (
        err as { headers?: { get?: (k: string) => string | null } }
      )?.headers?.get?.("retry-after");

      await logTranscriptionError({
        userId,
        errorCode: status ? `HTTP_${status}` : "SDK_ERROR",
        errorMessage: lastError.message,
        fileSizeBytes: fileSize,
        attemptNumber: attempt,
        apiRoute: "/api/audio/transcribe",
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

  throw lastError ?? new Error("Transcription failed after retries");
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

    const formData = await request.formData();
    const audioFile = formData.get("file") as File | null;
    const language = formData.get("language") as string | null;
    const prompt = formData.get("prompt") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    if (audioFile.size > MAX_BODY_SIZE) {
      return NextResponse.json(
        {
          error: `File size (${(audioFile.size / 1024 / 1024).toFixed(1)}MB) exceeds the 4.5MB direct upload limit. Use /api/audio/transcribe-url for larger files.`,
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_TYPES.some((type) => audioFile.type.includes(type.split("/")[1]))
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid audio file type. Supported: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm",
        },
        { status: 400 },
      );
    }

    const transcriptionOptions: Record<string, unknown> = {
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      temperature: 0.0,
    };

    if (language) transcriptionOptions.language = language;
    if (prompt) transcriptionOptions.prompt = prompt;

    const { data: transcription, attempts } = await transcribeWithRetry(
      transcriptionOptions,
      userId,
      audioFile.size,
    );

    const response = transcription as Record<string, unknown>;
    const rawText = (transcription as { text: string }).text ?? "";

    // Filter Whisper's well-known silence hallucinations ("Thank you.",
    // "Thanks for watching.", etc.) using segment-level `no_speech_prob`
    // and `avg_logprob` confidence signals, gated by a known-phrase denylist.
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
    const err = error instanceof Error ? error : new Error(extractErrorMessage(error));
    const status = (error as { status?: number })?.status;

    console.error("[/api/audio/transcribe] Final failure:", err.message);

    if (status === 401) {
      return NextResponse.json(
        { error: "Groq API authentication failed" },
        { status: 500 },
      );
    }

    if (status === 429) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again in a few seconds.",
          code: "RATE_LIMIT",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "Transcription failed",
        details: err.message,
        code: "TRANSCRIPTION_ERROR",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "audio-transcription",
    model: "whisper-large-v3-turbo",
    maxBodySize: "4.5MB",
    maxDuration: `${maxDuration}s`,
  });
}
