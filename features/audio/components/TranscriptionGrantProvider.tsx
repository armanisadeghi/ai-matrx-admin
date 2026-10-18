"use client";

// THE PUBLIC TRANSCRIPTION GRANT, DECLARED BY A PUBLIC SURFACE.
//
// Wrap a page whose visitor may have no account. While mounted, every transcription the shared
// voice stack makes goes through a short-lived grant minted from the capability this page already
// holds (`features/audio/services/transcriptionGrant.ts`), billed to the organization that owns it.
// The voice components inside are the SAME ones the signed-in app uses; nothing is forked.
//
//   <TranscriptionGrantProvider type="anon_form" capability={form.form_id}>…</TranscriptionGrantProvider>
//
// A new public surface adopts it by (1) a branch in `platform._transcription_capability` and a
// `platform.outsider_consumer` row for its resource, (2) this provider with that type.

import { useEffect, type ReactNode } from "react";

import { declareTranscriptionCapability } from "@/features/audio/services/transcriptionGrant";

export function TranscriptionGrantProvider({
  type,
  capability,
  children,
}: {
  /** The capability's kind, as `platform.mint_transcription_grant` knows it (`anon_form`). */
  type: string;
  /** The capability itself (a public form's id). */
  capability: string;
  children: ReactNode;
}) {
  useEffect(() => declareTranscriptionCapability({ type, capability }), [type, capability]);
  return <>{children}</>;
}
