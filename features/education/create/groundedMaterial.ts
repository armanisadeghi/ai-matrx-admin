// features/education/create/groundedMaterial.ts
//
// What an Education "Create" page hands its generator, built from the ONE server
// step (`POST /sources/resolve`, via `useSourceSet().resolve()`): the grounded
// text, the artifact's provenance, and a TrustEnvelope whose citations each
// open THEIR OWN Source. Pure — no I/O — so a page and its test share it.
//
// The same shape for mind maps, memory aids and audio study (and any later
// Education tool); flashcards keep their segmented path (`generateDeckFromSources`).

import type { ResolvedSource, ResolvedSourceSet, SourceSet } from "@ai-matrx/agents/sources";
import { attachRefsToCitation, recordKindOfResourceType } from "@/features/education/trust/grounding";
import type { SourceCitation, TrustEnvelope } from "@/features/education/trust/types";
import type { ConvertSource } from "@/features/education/convert/types";
import type { EduMediaSource } from "@/features/education/media/types";
import type { DeckSourceName } from "@/features/flashcards/data/deckSourceSet";
import { peekHref } from "@/features/organizations/peek/peekHref";

/** Everything a Create page needs once its Sources are read. */
export interface PreparedMaterial {
  /** The text the generator reads (a topic alone is just the topic). */
  content: string;
  /** What the artifact is called when its agent names none. */
  title: string;
  /** Provenance stored on the artifact row. */
  source: EduMediaSource;
  trust: TrustEnvelope;
  /** Deck ids among the Sources — cards for node links, weak areas for audio. */
  deckIds: string[];
  /** Lineage anchors, one per Source (empty for a topic alone). */
  lineageSources: ConvertSource[];
  /** The Sources exactly as chosen (parts, form, limit) — kept on the artifact. */
  chosen: SourceSet | null;
  names: Record<string, DeckSourceName> | null;
  /** Sentences about Sources left out or stood in for. */
  notes: string[];
  /** True when the material is Sources, false for a topic alone. */
  fromSources: boolean;
}

/** Up to two names, then "and N more". */
export function sourceTitleOf(labels: readonly string[]): string {
  if (labels.length === 0) return "Study material";
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels[0]}, ${labels[1]} and ${labels.length - 2} more`;
}

const CHUNK_HEADER_LINE = /^### Chunk \S+(?: \(page \d+\))?[ \t]*\n/gm;

/**
 * The server's grounding headers (`### Chunk <id> (page N)`) name parts for
 * citations; these generators cite per Source, so the headers are taken out
 * rather than read aloud or turned into nodes.
 */
export function withoutChunkHeaders(text: string): string {
  return text.replace(CHUNK_HEADER_LINE, "").trim();
}

/** The grounded text of every readable Source; several are told apart by a heading. */
export function groundedTextOf(sources: readonly ResolvedSource[]): string {
  const readable = sources.filter((s) => s.text.trim().length > 0);
  if (readable.length === 1) return withoutChunkHeaders(readable[0]!.text);
  return readable.map((s) => `## ${s.label}\n${withoutChunkHeaders(s.text)}`).join("\n\n");
}

/** One citation per readable Source — each opens its own file, document, page or record. */
export function trustFromResolved(sources: readonly ResolvedSource[]): TrustEnvelope {
  const readable = sources.filter((s) => s.text.trim().length > 0);
  const citations = readable.map((s): SourceCitation => {
    const type = s.ref.resource_type;
    const sourceId = s.processed_document_id ?? s.file_id ?? s.ref.resource_id;
    const base: SourceCitation = {
      sourceId,
      sourceKind: s.file_id && !s.processed_document_id ? "file" : "document",
      title: s.label,
    };
    return attachRefsToCitation(base, {
      fileId: s.file_id ?? null,
      documentId: s.processed_document_id ?? null,
      // A Source with no file behind it (a note, a deck, a record) opens its own page.
      url: s.file_id ? null : (peekHref(type, s.ref.resource_id) ?? null),
      title: s.label,
      recordKind: recordKindOfResourceType(type),
    });
  });
  return {
    citations,
    confidence: "grounded",
    groundedIn: readable.map((s) => s.label).join(", "),
  };
}

/** Provenance of the artifact: one deck is "deck"; anything else is named material. */
export function mediaSourceOf(sources: readonly ResolvedSource[]): EduMediaSource {
  const readable = sources.filter((s) => s.text.trim().length > 0);
  const only = readable.length === 1 ? readable[0]! : null;
  if (only && only.ref.resource_type === "fc_set") {
    return { kind: "deck", id: only.ref.resource_id, title: only.label };
  }
  return { kind: "topic", id: null, title: sourceTitleOf(readable.map((s) => s.label)).slice(0, 120) };
}

/** Deck ids among the readable Sources. */
export function deckIdsOf(sources: readonly ResolvedSource[]): string[] {
  return sources
    .filter((s) => s.ref.resource_type === "fc_set" && s.text.trim().length > 0)
    .map((s) => s.ref.resource_id);
}

/** Sentences about what was left out or stood in for, in the Source's own words. */
export function notesOf(resolved: ResolvedSourceSet): string[] {
  const dropped = resolved.dropped.map(
    (d) => d.detail ?? `One source was left out (${d.reason.replace("_", " ")}).`,
  );
  const standIns = resolved.sources.flatMap((s) => s.notes.map((n) => `${s.label}: ${n}`));
  return [...dropped, ...standIns];
}

/**
 * A topic typed beside Sources only steers them ("Focus on: …"); alone it is the
 * material. Joined to the person's own focus line.
 */
export function focusWithTopic(topic: string, focus: string): string {
  return [topic.trim() ? `Focus on: ${topic.trim()}` : "", focus.trim()].filter(Boolean).join("\n\n");
}
