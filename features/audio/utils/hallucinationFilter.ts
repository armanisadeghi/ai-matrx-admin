/**
 * Whisper Hallucination Filter
 *
 * Whisper models (including Groq's `whisper-large-v3-turbo`) reliably hallucinate
 * phrases from their YouTube-style training data — "Thank you.", "Thanks for
 * watching.", "Please subscribe.", a bare "you", "." and similar — whenever
 * they encounter silence, near-silence, or very short / low-energy audio.
 *
 * This utility strips those hallucinations using two layers of defense:
 *
 *   Layer 1 — Confidence gate (primary, safe):
 *     Whisper returns `no_speech_prob` and `avg_logprob` per segment. Genuine
 *     speech reliably scores `no_speech_prob < 0.1` with `avg_logprob > -0.5`.
 *     Hallucinations on silence reliably score `no_speech_prob > 0.8` with
 *     `avg_logprob < -1.0`. The safety margin is wide, so dropping segments
 *     where `no_speech_prob > 0.6 AND avg_logprob < -1.0` catches the vast
 *     majority of hallucinations with near-zero risk of clipping real speech.
 *     These thresholds are OpenAI's own recommended values from the Whisper
 *     reference implementation.
 *
 *   Layer 2 — Known-phrase denylist (secondary, gated):
 *     A short, curated list of canonical Whisper hallucination phrases. Only
 *     applied to segments that are ALSO borderline-confident
 *     (`no_speech_prob > 0.4`). A real spoken "thank you" has
 *     `no_speech_prob ≈ 0.05`, so the gate ensures we never clip it.
 *
 * If every segment in a response is flagged, we return empty text — callers
 * already treat empty transcriptions as "nothing was said".
 */

export interface WhisperSegment {
  id?: number;
  seek?: number;
  start?: number;
  end?: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

// OpenAI's reference thresholds.
const NO_SPEECH_PROB_THRESHOLD = 0.6;
const AVG_LOGPROB_THRESHOLD = -1.0;

// Softer gate for the denylist check — never used standalone.
const DENYLIST_NO_SPEECH_GATE = 0.4;

/**
 * Canonical lowercase forms of phrases Whisper is known to hallucinate on
 * silence. Intentionally narrow: phrases that are (a) widely documented
 * hallucinations and (b) unlikely to be the sole content of a real voice
 * note. Genuine spoken versions of these phrases will have strong
 * `no_speech_prob` scores and will not hit the denylist because of the
 * confidence gate above.
 */
const KNOWN_HALLUCINATIONS: ReadonlySet<string> = new Set([
  "thank you",
  "thank you.",
  "thank you!",
  "thanks",
  "thanks.",
  "thanks for watching",
  "thanks for watching!",
  "thanks for watching.",
  "thank you for watching",
  "thank you for watching.",
  "thank you for watching!",
  "please subscribe",
  "please subscribe.",
  "please like and subscribe",
  "like and subscribe",
  "subscribe to my channel",
  "don't forget to subscribe",
  "you",
  "you.",
  ".",
  "..",
  "...",
  "!",
  "?",
  "bye",
  "bye.",
  "goodbye",
  "goodbye.",
]);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function isLikelyHallucination(seg: WhisperSegment): boolean {
  const noSpeechProb =
    typeof seg.no_speech_prob === "number" ? seg.no_speech_prob : 0;
  const avgLogprob = typeof seg.avg_logprob === "number" ? seg.avg_logprob : 0;

  // Layer 1: Whisper's own confidence signal says "probably not speech" AND
  // the token-level confidence is very poor.
  if (
    noSpeechProb > NO_SPEECH_PROB_THRESHOLD &&
    avgLogprob < AVG_LOGPROB_THRESHOLD
  ) {
    return true;
  }

  // Layer 2: Borderline confidence AND text matches a canonical
  // Whisper-hallucination phrase. This catches the rare case where the
  // model emits a known pattern with a slightly better logprob score.
  if (noSpeechProb > DENYLIST_NO_SPEECH_GATE) {
    const normalized = normalize(seg.text);
    if (KNOWN_HALLUCINATIONS.has(normalized)) return true;
  }

  return false;
}

export interface HallucinationFilterResult {
  /** Text reconstructed from surviving segments. Empty if all were dropped. */
  text: string;
  /** Segments that passed the filter, in original order. */
  segments: WhisperSegment[];
  /** Segments that were identified as hallucinations and removed. */
  droppedSegments: WhisperSegment[];
  /** Whether anything was filtered. Useful for logging / observability. */
  filtered: boolean;
}

/**
 * Filter Whisper hallucinations out of a verbose_json response.
 *
 * If `segments` is missing or not an array, the original text is returned
 * unchanged (we can't filter what we can't see). Callers MUST request
 * `response_format: 'verbose_json'` for this filter to have any effect.
 */
export function filterWhisperHallucinations(
  originalText: string,
  segments: unknown,
): HallucinationFilterResult {
  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      text: originalText,
      segments: [],
      droppedSegments: [],
      filtered: false,
    };
  }

  const typed = segments as WhisperSegment[];
  const kept: WhisperSegment[] = [];
  const dropped: WhisperSegment[] = [];

  for (const seg of typed) {
    if (!seg || typeof seg.text !== "string") continue;
    if (isLikelyHallucination(seg)) dropped.push(seg);
    else kept.push(seg);
  }

  if (dropped.length === 0) {
    return {
      text: originalText,
      segments: typed,
      droppedSegments: [],
      filtered: false,
    };
  }

  const rebuiltText = kept
    .map((s) => s.text.trim())
    .filter((t) => t.length > 0)
    .join(" ")
    .trim();

  return {
    text: rebuiltText,
    segments: kept,
    droppedSegments: dropped,
    filtered: true,
  };
}
