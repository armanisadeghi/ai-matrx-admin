// features/education/create/chunkCitations.ts
//
// A generated item (a mind-map node, a memory-aid mnemonic / analogy / stop) is
// traced to the ONE grounded passage it most overlaps, so its citation opens that
// page or place — not just the whole Source. The generator reads the material with
// the server's `### Chunk <id> (page N)` markers (`PreparedMaterial.chunks`); a
// chunk's citation is the same one the kits use (`sourceKind: "chunk"`, the Source's
// file / document, the page) so the existing Source Inspector (`useCitationPlace`,
// `citedPlace`) opens it at the cited page, time or record part.
//
// Tuned for PRECISION, like `linkDiagramToCards`: an abstract grouping item that
// overlaps no passage stays uncited rather than pointing at an unrelated one. A
// chunk id the generator itself cited wins over the overlap guess. Pure.

import type { SourceCitation } from "@/features/education/trust/types";
import { attachRefsToCitation } from "@/features/education/trust/grounding";
import { tokenize } from "@/features/education/media/mindmap/linkCards";
import type { GroundedChunk } from "./groundedMaterial";

/** Fewest shared words, and the (rarity-weighted) share of the item's words a passage must hold. */
const MIN_SHARED = 2;
const MIN_SCORE = 0.5;
/** The best passage must lead the runner-up by this much of the score, or the item stays uncited. */
const MIN_LEAD = 0.1;
/** An item with fewer content words than this is cited only by an exact phrase match. */
const MIN_CONTENT_WORDS = 3;
/** The passage quoted on the citation (the verbatim anchor "Verify against source" reads). */
const EXCERPT_CHARS = 280;

/** A `### Chunk <id> (page N)` grounding marker, wherever it appears in a string. */
const CHUNK_MARKER_RE = /#{1,6}[ \t]*Chunk[ \t]+[^\s()]+(?:[ \t]*\(page[ \t]+\d+\))?/gi;

/** A string without any grounding marker text (the generator reads markers; its output must not echo them). */
export function stripChunkMarkers(text: string): string {
  if (!text.includes("#")) return text;
  return text.replace(CHUNK_MARKER_RE, "").replace(/[ \t]{2,}/g, " ").trim();
}

/** Every string in a generated value with marker text taken out (copies; never mutates). */
export function stripChunkMarkersDeep<T>(value: T): T {
  if (typeof value === "string") return stripChunkMarkers(value) as unknown as T;
  if (Array.isArray(value)) return value.map(stripChunkMarkersDeep) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripChunkMarkersDeep(v)])) as T;
  }
  return value;
}

const normalizeWords = (t: string): string => ` ${t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()} `;

/** The citation of one grounded passage: its Source's file / document, the page, the quoted words. */
export function citationForChunk(chunk: GroundedChunk, itemText?: string): SourceCitation {
  const base: SourceCitation = {
    sourceId: chunk.id,
    sourceKind: "chunk",
    title: chunk.source.title,
    excerpt: itemText ? excerptFor(itemText, chunk) : chunk.text.replace(/\s+/g, " ").trim().slice(0, EXCERPT_CHARS),
    ...(chunk.page ? { locator: `p. ${chunk.page}`, page: chunk.page } : {}),
  };
  return attachRefsToCitation(base, {
    fileId: chunk.source.fileId,
    documentId: chunk.source.documentId,
    url: chunk.source.url,
    title: chunk.source.title,
    recordKind: chunk.source.recordKind,
  });
}

/** How much each word of the item weighs: words few passages use identify a passage; ones in all of them do not. */
function weightsFor(tokens: Set<string>, chunkTokens: readonly Set<string>[]): Map<string, number> {
  const n = chunkTokens.length;
  const w = new Map<string, number>();
  for (const t of tokens) {
    const df = chunkTokens.reduce((c, set) => c + (set.has(t) ? 1 : 0), 0);
    w.set(t, Math.log(1 + n / Math.max(df, 1)));
  }
  return w;
}

function overlap(tokens: Set<string>, weights: Map<string, number>, other: Set<string>): { shared: number; score: number } {
  let shared = 0;
  let got = 0;
  let total = 0;
  for (const t of tokens) {
    const wt = weights.get(t) ?? 1;
    total += wt;
    if (other.has(t)) {
      shared += 1;
      got += wt;
    }
  }
  return { shared, score: total > 0 ? got / total : 0 };
}

/**
 * The passage that best holds an item's words, or null when none clearly does: every passage is
 * scored (rarer words weigh more), the best must clear the bar AND lead the runner-up, and an item
 * with only a word or two must appear as an exact phrase.
 */
export function bestChunkFor(itemText: string, chunks: readonly GroundedChunk[]): GroundedChunk | null {
  const tokens = tokenize(itemText);
  if (tokens.size === 0) return null;
  const chunkTokens = chunks.map((c) => tokenize(c.text));
  const weights = weightsFor(tokens, chunkTokens);
  const phrase = tokens.size < MIN_CONTENT_WORDS ? normalizeWords(itemText) : null;
  const scored = chunks
    .map((chunk, i) => {
      const o = overlap(tokens, weights, chunkTokens[i]!);
      const qualifies = o.shared >= MIN_SHARED && o.score >= MIN_SCORE && (!phrase || normalizeWords(chunk.text).includes(phrase));
      return { chunk, score: o.score, qualifies };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || !best.qualifies) return null;
  const runnerUp = scored[1];
  if (runnerUp && best.score - runnerUp.score < MIN_LEAD) return null;
  return best.chunk;
}

/** The sentence(s) of a passage that best match the item (the passage start when none stands out). */
export function excerptFor(itemText: string, chunk: GroundedChunk): string {
  const flat = chunk.text.replace(/\s+/g, " ").trim();
  const tokens = tokenize(itemText);
  const sentences = flat.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((x) => x.trim()).filter(Boolean) ?? [flat];
  if (tokens.size === 0 || sentences.length <= 1) return flat.slice(0, EXCERPT_CHARS);
  const sets = sentences.map((x) => tokenize(x));
  const weights = weightsFor(tokens, sets);
  let bestI = -1;
  let bestShared = 0;
  let bestScore = 0;
  sets.forEach((set, i) => {
    const o = overlap(tokens, weights, set);
    if (o.shared > bestShared || (o.shared === bestShared && o.score > bestScore)) {
      bestI = i;
      bestShared = o.shared;
      bestScore = o.score;
    }
  });
  if (bestI < 0) return flat.slice(0, EXCERPT_CHARS);
  let out = sentences[bestI]!;
  // A short best sentence keeps its neighbour for context while it fits.
  const next = sentences[bestI + 1];
  if (next && out.length + next.length + 1 <= EXCERPT_CHARS && out.length < 80) out = `${out} ${next}`;
  return out.slice(0, EXCERPT_CHARS);
}

/** A chunk id the generator itself named on an item (`source_chunk_ids`, `chunk_id`, `citation.sourceId`). */
function citedChunkId(item: Record<string, unknown>, known: ReadonlySet<string>): string | null {
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const fromList = (v: unknown) => (Array.isArray(v) ? v.find((x): x is string => typeof x === "string" && known.has(x)) : undefined);
  const single = [item.chunk_id, meta.chunk_id, (item.citation as { sourceId?: unknown } | undefined)?.sourceId].find(
    (x): x is string => typeof x === "string" && known.has(x),
  );
  return single ?? fromList(item.source_chunk_ids) ?? fromList(meta.source_chunk_ids) ?? null;
}

/** The citation for one generated item: what the generator cited, else the best-overlapping passage. */
export function citationForItem(
  item: Record<string, unknown>,
  itemText: string,
  chunks: readonly GroundedChunk[],
): SourceCitation | null {
  if (chunks.length === 0) return null;
  const named = citedChunkId(item, new Set(chunks.map((c) => c.id)));
  const chunk = (named ? chunks.find((c) => c.id === named) : null) ?? bestChunkFor(itemText, chunks);
  return chunk ? citationForChunk(chunk, itemText) : null;
}
