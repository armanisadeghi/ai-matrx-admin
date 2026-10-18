/**
 * THE PUBLIC TRANSCRIPTION GRANT — the voice stack for a person with no account.
 *
 * A public surface that already holds a capability (today: a public form link, `anon_form` + its
 * id) declares it with `<TranscriptionGrantProvider>`. While it is declared, every transcription the
 * shared voice stack makes (`transcribeAudioFile` → the one recorder, `useVoiceCapture`,
 * `useRecordAndTranscribe`, `ProTextarea`'s mic, `VoiceInputButton`) goes through
 * `POST /audio/grant/transcribe` with a short-lived grant instead of the person's session, so the
 * SAME components work on a public page. The grant comes straight from the database door
 * `platform.mint_transcription_grant` (anonymous-callable); the server checks it, applies the
 * `media.transcription` `public_*` knobs, and bills the organization that owns the capability.
 *
 * A refusal is never silent: it throws `TranscriptionGrantRefusal` carrying the door's sentence
 * ("This link has used its spoken answers for today. Please type your answer."), which the voice
 * stack shows like any transcription error. Typing always works.
 *
 * Design: common-docs/systems/media/media-capture/FEATURE.md § Public transcription grant.
 */

import { MatrxApiError, createApi, type Api, type OperationDescriptor } from "@ai-matrx/api";
import type { components } from "@ai-matrx/api/types";

import { resolveBaseUrl } from "@/lib/python-client";
import { supabase } from "@/utils/supabase/client";

type TranscriptionWire = components["schemas"]["aidream__services__audio__speech__TranscriptionResponse"];

/** What a public surface already holds and trades for a grant. */
export interface TranscriptionCapability {
  /** The capability's kind, as the door knows it (`anon_form`). */
  type: string;
  /** The capability itself (a public form's id). */
  capability: string;
}

/** The door refused, in its own words. `reason` is the machine word (`capability_daily_limit`, …). */
export class TranscriptionGrantRefusal extends Error {
  override readonly name = "TranscriptionGrantRefusal";
  readonly reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.reason = reason;
  }
}

/** The header the server reads the grant from. Never a query parameter. */
export const TRANSCRIPTION_GRANT_HEADER = "X-Transcription-Grant";

/** A grant is renewed this long before it runs out, so a clip in flight never carries a dead one. */
const RENEW_BEFORE_EXPIRY_MS = 30_000;

/** Reasons that mean "this grant is spent, get a fresh one" — retried once with a new grant. */
const STALE_GRANT_REASONS = new Set(["grant_expired", "grant_unknown", "grant_revoked", "grant_missing"]);

const TRANSCRIBE_WITH_GRANT: OperationDescriptor = {
  m: "POST",
  p: "/audio/grant/transcribe",
  d: "aidream",
  a: "public",
  o: "exempt",
  n: "audio.transcribe_with_public_grant",
};

/** No session, no fingerprint, no organization header: the grant is the whole identity. */
const publicApi: Api = createApi({
  resolveBaseUrl: (deployment) => (deployment === "aidream" ? resolveBaseUrl() : undefined),
  connectTimeoutMs: 30_000,
});

let active: TranscriptionCapability | null = null;
let held: { key: string; grant: string; expiresAt: number } | null = null;

const keyOf = (capability: TranscriptionCapability) => `${capability.type}:${capability.capability}`;

/**
 * Declare the capability this page holds. Returns the release; the last declaration wins.
 * Use `<TranscriptionGrantProvider>` rather than calling this by hand.
 */
export function declareTranscriptionCapability(capability: TranscriptionCapability): () => void {
  active = capability;
  if (held && held.key !== keyOf(capability)) held = null;
  return () => {
    if (active && keyOf(active) === keyOf(capability)) {
      active = null;
      held = null;
    }
  };
}

/** The capability the voice stack transcribes under right now, or null (the person's own session). */
export function activeTranscriptionCapability(): TranscriptionCapability | null {
  return active;
}

type MintAnswer =
  | { ok: true; grant: string; expires_at: string; clip_max_seconds: number }
  | { ok: false; reason: string; message: string };

function readMintAnswer(data: unknown): MintAnswer {
  if (data && typeof data === "object" && "ok" in data) {
    const answer = data as Record<string, unknown>;
    if (answer.ok === true && typeof answer.grant === "string" && typeof answer.expires_at === "string") {
      return {
        ok: true,
        grant: answer.grant,
        expires_at: answer.expires_at,
        clip_max_seconds: typeof answer.clip_max_seconds === "number" ? answer.clip_max_seconds : 0,
      };
    }
    if (answer.ok === false) {
      return {
        ok: false,
        reason: typeof answer.reason === "string" ? answer.reason : "refused",
        message: typeof answer.message === "string" ? answer.message : "Spoken answers are not available right now.",
      };
    }
  }
  throw new Error("platform.mint_transcription_grant answered no grant and no refusal.");
}

async function grantFor(capability: TranscriptionCapability, renew: boolean): Promise<string> {
  const key = keyOf(capability);
  if (!renew && held && held.key === key && held.expiresAt - RENEW_BEFORE_EXPIRY_MS > Date.now()) {
    return held.grant;
  }
  const { data, error } = await supabase.schema("platform").rpc("mint_transcription_grant", {
    p_capability_type: capability.type,
    p_capability: capability.capability,
  });
  if (error) throw new Error(`Could not get permission to transcribe: ${error.message}`);
  const answer = readMintAnswer(data);
  if (!answer.ok) throw new TranscriptionGrantRefusal(answer.reason, answer.message);
  held = { key, grant: answer.grant, expiresAt: Date.parse(answer.expires_at) };
  return answer.grant;
}

function refusalOf(err: unknown): TranscriptionGrantRefusal | null {
  if (!(err instanceof MatrxApiError)) return null;
  const body = err.serverDetail;
  const detail = body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : null;
  if (detail && typeof detail === "object" && "error" in detail) {
    const { error, message } = detail as { error: unknown; message?: unknown };
    if (typeof error === "string") {
      return new TranscriptionGrantRefusal(
        error,
        typeof message === "string" ? message : "Spoken answers are not available right now.",
      );
    }
  }
  return null;
}

/**
 * Transcribe one clip under the active capability's grant. A spent grant is replaced once;
 * every other refusal throws `TranscriptionGrantRefusal` with the server's sentence.
 */
export async function transcribeWithGrant(
  capability: TranscriptionCapability,
  form: FormData,
  request: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<TranscriptionWire> {
  for (const renew of [false, true]) {
    const grant = await grantFor(capability, renew);
    try {
      return await publicApi.call<TranscriptionWire>(
        TRANSCRIBE_WITH_GRANT,
        { body: form },
        {
          headers: { [TRANSCRIPTION_GRANT_HEADER]: grant },
          ...(request.signal ? { signal: request.signal } : {}),
          ...(request.timeoutMs ? { totalTimeoutMs: request.timeoutMs } : {}),
        },
      );
    } catch (err) {
      const refusal = refusalOf(err);
      if (refusal && !renew && STALE_GRANT_REASONS.has(refusal.reason)) {
        held = null;
        continue;
      }
      throw refusal ?? err;
    }
  }
  throw new TranscriptionGrantRefusal("grant_unknown", "This voice permission is not valid. Reload the page to try again.");
}
