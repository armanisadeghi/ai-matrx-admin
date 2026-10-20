"use client";

import { Suspense } from "react";
import MatrxMiniLoader from "@/components/loaders/MatrxMiniLoader";
import type { ArtifactRendererProps } from "../types";
import TranscriptBlock from "@/components/mardown-display/blocks/transcripts/TranscriptBlock";
import type { ParsedTranscript } from "@/components/mardown-display/blocks/transcripts/transcript-parser";
import { transcriptMarkdownFromValue } from "@/features/content-ir/kinds/transcript";
import { storedKindValue } from "../storedKindValue";

/**
 * Unified renderer for `transcript` artifacts — a transcript is durable content,
 * so it materializes (persisted, versioned, render-by-id). Renders the existing
 * TranscriptBlock viewer. Full two-way sync to the transcription system
 * (features/transcripts) is the next adapter layer — see FEATURE.md.
 *
 * A `transcript` kind value (`{"__kind":"transcript",…}` as `raw`, or an
 * object/JSON-string `data`) draws through the kind's bridge (`serverData`, the
 * parsed transcript) and its markdown projection — never as its JSON text
 * (2026-10-19, same class as StructuredInfoArtifact).
 */
export default function TranscriptArtifact({
  raw,
  data,
  serverData,
}: ArtifactRendererProps) {
  const value = storedKindValue(data ?? raw);
  const isKindValue =
    !!value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).__kind === "transcript";
  const content = isKindValue
    ? transcriptMarkdownFromValue(value as Record<string, unknown>)
    : typeof data === "string"
      ? data
      : raw;
  const parsed = isParsedTranscript(serverData) ? serverData : undefined;
  if (!content) return null;
  return (
    <Suspense fallback={<MatrxMiniLoader />}>
      <TranscriptBlock content={content} parsed={parsed} />
    </Suspense>
  );
}

function isParsedTranscript(value: unknown): value is ParsedTranscript {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { segments?: unknown }).segments)
  );
}
