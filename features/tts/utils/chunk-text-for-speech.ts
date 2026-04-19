/**
 * chunk-text-for-speech
 *
 * Splits already-cleaned text into small chunks suitable for progressive
 * streaming to Cartesia via contextId + continue: true.
 *
 * Design goals:
 *   - The FIRST chunk is tiny (one short sentence or sub-sentence) so the
 *     time-to-first-audio is minimized — Cartesia starts generating audio
 *     from the first send and we want that send to be as cheap as possible.
 *   - Subsequent chunks can be larger (still bounded) — they queue into the
 *     same context while playback is already rolling.
 *   - Falls back to character-based splitting if the input has no sentence
 *     boundaries.
 *
 * Implementation:
 *   Primary: `Intl.Segmenter(lang, { granularity: 'sentence' })` — widely
 *   available in modern browsers, produces correct sentence boundaries for
 *   English abbreviations, ellipses, etc.
 *
 *   Fallback: regex-based split on sentence-ending punctuation followed by
 *   whitespace. Handles anything old enough to not have Intl.Segmenter.
 *
 *   Greedy packing: After sentence segmentation, sentences are combined up
 *   to MAX chars per chunk (after the first chunk). Over-long sentences are
 *   hard-split at commas / spaces / chars as a last resort.
 */

/** Char ceilings: tuned for ~200-300ms time-to-first-audio on Sonic. */
const FIRST_CHUNK_MAX = 160;
const NEXT_CHUNK_MAX = 400;
/** Below this, we merge tiny trailing fragments into the previous chunk. */
const MIN_CHUNK = 24;

export interface ChunkOptions {
  /** BCP-47 language tag for Intl.Segmenter. Defaults to "en". */
  lang?: string;
  /** Max chars in the very first chunk. Keep small for fastest first audio. */
  firstChunkMax?: number;
  /** Max chars in every subsequent chunk. */
  nextChunkMax?: number;
}

/**
 * Split `text` into an ordered list of chunks ready to stream to Cartesia.
 * Whitespace at chunk boundaries is preserved only inside chunks — chunks
 * themselves are trimmed, and empty chunks are dropped.
 */
export function chunkTextForSpeech(text: string, opts: ChunkOptions = {}): string[] {
  const input = (text ?? '').trim();
  if (!input) return [];

  const lang = opts.lang ?? 'en';
  const firstMax = Math.max(40, opts.firstChunkMax ?? FIRST_CHUNK_MAX);
  const nextMax = Math.max(firstMax, opts.nextChunkMax ?? NEXT_CHUNK_MAX);

  const sentences = segmentSentences(input, lang);

  // Pack sentences greedily. First chunk uses firstMax; rest use nextMax.
  const chunks: string[] = [];
  let current = '';
  let isFirst = true;

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    const limit = isFirst ? firstMax : nextMax;

    // If this single sentence is longer than the limit, hard-split it.
    if (s.length > limit) {
      if (current) {
        chunks.push(current);
        current = '';
        isFirst = false;
      }
      const parts = hardSplit(s, isFirst ? firstMax : nextMax);
      for (const p of parts) {
        chunks.push(p);
        isFirst = false;
      }
      continue;
    }

    const tentative = current ? `${current} ${s}` : s;
    if (tentative.length <= limit) {
      current = tentative;
    } else {
      chunks.push(current);
      current = s;
      isFirst = false;
    }
  }

  if (current) chunks.push(current);

  // Merge any tail chunk that's too tiny into the prior chunk — avoids a
  // pointless extra WS send for "Thanks." after a long paragraph.
  if (chunks.length > 1 && chunks[chunks.length - 1].length < MIN_CHUNK) {
    const tail = chunks.pop()!;
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${tail}`;
  }

  return chunks;
}

function segmentSentences(input: string, lang: string): string[] {
  // Prefer Intl.Segmenter (handles abbreviations, Unicode, locale rules).
  const SegmenterCtor = (Intl as unknown as {
    Segmenter?: new (
      lang: string,
      options: { granularity: 'sentence' | 'word' | 'grapheme' },
    ) => { segment: (s: string) => Iterable<{ segment: string }> };
  }).Segmenter;

  if (SegmenterCtor) {
    try {
      const segmenter = new SegmenterCtor(lang, { granularity: 'sentence' });
      const out: string[] = [];
      for (const seg of segmenter.segment(input)) {
        if (seg.segment.trim()) out.push(seg.segment);
      }
      if (out.length > 0) return out;
    } catch {
      // fall through to regex fallback
    }
  }

  // Fallback: split on sentence-ending punctuation followed by whitespace.
  // Preserves the terminator with the preceding sentence.
  const parts = input.split(/(?<=[.!?…])\s+/);
  return parts.length > 0 ? parts : [input];
}

/**
 * Hard-split an over-long sentence into pieces no longer than `max`. Tries
 * comma/semicolon boundaries first, then spaces, then falls back to raw
 * character slicing so we never exceed the limit.
 */
function hardSplit(sentence: string, max: number): string[] {
  if (sentence.length <= max) return [sentence];

  const out: string[] = [];
  let remaining = sentence;

  while (remaining.length > max) {
    // Try to break on , ; — : within the first `max` chars, preferring later.
    const window = remaining.slice(0, max);
    const softIdx = Math.max(
      window.lastIndexOf(', '),
      window.lastIndexOf('; '),
      window.lastIndexOf(' — '),
      window.lastIndexOf(': '),
    );
    if (softIdx > max * 0.5) {
      out.push(remaining.slice(0, softIdx + 1).trim());
      remaining = remaining.slice(softIdx + 1).trim();
      continue;
    }

    // Try a space break.
    const spaceIdx = window.lastIndexOf(' ');
    if (spaceIdx > max * 0.5) {
      out.push(remaining.slice(0, spaceIdx).trim());
      remaining = remaining.slice(spaceIdx + 1).trim();
      continue;
    }

    // Last resort: hard slice.
    out.push(remaining.slice(0, max));
    remaining = remaining.slice(max);
  }

  if (remaining) out.push(remaining);
  return out;
}
