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

/** Fewest shared words, and the share of the item's words a passage must hold. */
const MIN_SHARED = 2;
const MIN_SCORE = 0.5;
/** The passage quoted on the citation (the verbatim anchor "Verify against source" reads). */
const EXCERPT_CHARS = 280;

/** The citation of one grounded passage: its Source's file / document, the page, the quoted words. */
export function citationForChunk(chunk: GroundedChunk): SourceCitation {
  const base: SourceCitation = {
    sourceId: chunk.id,
    sourceKind: "chunk",
    title: chunk.source.title,
    excerpt: chunk.text.replace(/\s+/g, " ").trim().slice(0, EXCERPT_CHARS),
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

/** The passage that best holds an item's words, or null when none clears the bar. */
export function bestChunkFor(itemText: string, chunks: readonly GroundedChunk[]): GroundedChunk | null {
  const tokens = tokenize(itemText);
  if (tokens.size === 0) return null;
  let best: { chunk: GroundedChunk; score: number } | null = null;
  for (const chunk of chunks) {
    const chunkTokens = tokenize(chunk.text);
    let shared = 0;
    for (const t of tokens) if (chunkTokens.has(t)) shared += 1;
    const score = shared / tokens.size;
    if (shared >= MIN_SHARED && score >= MIN_SCORE && (!best || score > best.score)) best = { chunk, score };
  }
  return best?.chunk ?? null;
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
  return chunk ? citationForChunk(chunk) : null;
}
