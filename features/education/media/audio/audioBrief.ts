// features/education/media/audio/audioBrief.ts
//
// Turns an education audio-study request (a source + a format + adaptivity) into
// the podcast generator's `PodcastGenerateRequest`. This is the ONE place that
// knows how each format (overview / debate / panel) maps onto the reused podcast
// pipeline — everything downstream is the generic podcast machinery.
//
// The audio pipeline is aidream-owned; we only shape its request. Generalizes
// flashcards' `buildDeckOverviewRequest` (Phase 7) into the multi-format,
// weak-area-adaptive education tool.

import { createSourceRef, createSourceSet, type SourceSet } from "@ai-matrx/agents/sources";
import type { ConvertSource } from "@/features/education/convert/types";
import type { PodcastGenerateRequest } from "@/features/podcasts/generator/types";
import type { CardWithDetails, FcSetRow } from "@/features/flashcards/data/types";
import type { EduAudioFormat } from "../types";

const MAX_CARDS = 80;

/** Serialize a deck (+ up to MAX_CARDS cards) to the markdown the script agent narrates. */
export function serializeDeck(
  set: Pick<FcSetRow, "name" | "topic" | "description">,
  cards: CardWithDetails[],
): { markdown: string; truncated: boolean } {
  const truncated = cards.length > MAX_CARDS;
  const included = truncated ? cards.slice(0, MAX_CARDS) : cards;

  const header = [
    `# Study deck: ${set.name}`,
    set.topic ? `Topic: ${set.topic}` : null,
    set.description || null,
  ]
    .filter(Boolean)
    .join("\n");

  const body = included
    .map((card, i) => {
      const helper = card.details.find((d) => d.kind === "helper")?.text;
      const example = card.details.find((d) => d.kind === "example")?.text;
      const lines = [`## Card ${i + 1}`, `Q: ${card.front}`, `A: ${card.back}`];
      if (helper) lines.push(`Hint: ${helper}`);
      if (example) lines.push(`Example: ${example}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return { markdown: `${header}\n\n${body}`, truncated };
}

/**
 * The Sources a converted material was read from, as the SourceSet the podcast
 * server reads: every Source of a multi-source kit, else the stored file, the
 * processed document, or the origin entity (a deck, a note). Null when nothing
 * stands behind the text (it is the words the person gave).
 */
export function audioSourceSetOf(source: ConvertSource): SourceSet | null {
  const ref = source.ref;
  const refs = ref?.kitSources?.length
    ? ref.kitSources.map((k) => createSourceRef(k.type, k.id, { delivery: "direct" }))
    : ref?.fileId
      ? [createSourceRef("file", ref.fileId, { delivery: "direct" })]
      : ref?.processedDocumentId
        ? [createSourceRef("processed_document", ref.processedDocumentId, { delivery: "direct" })]
        : ref?.entityType && ref.entityId
          ? [createSourceRef(ref.entityType, ref.entityId, { delivery: "direct" })]
          : [];
  return refs.length ? createSourceSet(refs) : null;
}

/** Per-format base framing for the script agents. */
function formatFraming(format: EduAudioFormat): {
  podFormat: string;
  theme?: string;
  defaultHosts: number;
  steer: string;
} {
  switch (format) {
    case "debate":
      return {
        podFormat: "debate",
        theme: "debate: two experts argue opposing interpretations of this material",
        defaultHosts: 2,
        steer:
          "Stage a genuine debate: give the two hosts DISTINCT, opposed positions and clearly different voices/personalities. They should challenge each other, concede good points, and surface the real tensions in the material — not politely agree. Keep it grounded in the source; do not invent facts to win a point.",
      };
    case "panel":
      return {
        podFormat: "panel",
        theme: "expert panel roundtable on this material",
        defaultHosts: 4,
        steer:
          "Run it like a produced roundtable: each host owns a distinct angle and voice, they build on and interrupt each other naturally, and a light moderator keeps it moving. Cover the material thoroughly but conversationally.",
      };
    case "overview":
    default:
      return {
        podFormat: "educational",
        defaultHosts: 2,
        steer:
          "Narrate this as a conversational study review that walks through the concepts and their meaning, quizzing the listener lightly and explaining anything non-obvious — don't just read Q/A pairs verbatim.",
      };
  }
}

/**
 * What the episode is made from. Sources go as their SourceSet — the podcast
 * server reads them (once, as the person) and links each one to the episode;
 * the browser never sends their text. A topic, or words with no Source behind
 * them, are what the person gave and go as `input_data`.
 */
export type AudioMaterial =
  | { kind: "sources"; sourceSet: SourceSet }
  | { kind: "topic"; topic: string }
  | { kind: "words"; words: string };

export interface BuildAudioRequestParams {
  format: EduAudioFormat;
  material: AudioMaterial;
  hostCount?: number;
  language?: string;
  /**
   * When set, the brief tells the agent to spend extra time on these weak
   * concepts (adaptive audio — the thing a one-shot summary structurally can't
   * do). A short human-readable list of the listener's weakest items.
   */
  weakAreaNote?: string | null;
}

/**
 * Build the `PodcastGenerateRequest` for one audio-study generation. Audio-only
 * (max_images/videos = 0) so it stays fast + cheap; high-quality TTS so the
 * saved audio is durable/produced-grade.
 */
export function buildAudioRequest(
  params: BuildAudioRequestParams,
): PodcastGenerateRequest {
  const { podFormat, theme, defaultHosts, steer } = formatFraming(params.format);
  const hostCount = Math.max(1, params.hostCount ?? defaultHosts);

  const adaptive = params.weakAreaNote
    ? ` The listener has been struggling with these specific concepts — spend extra time making them click, with fresh explanations and examples: ${params.weakAreaNote}.`
    : "";

  const prep = `${steer}${adaptive}`;

  const from = params.material;
  const what: Pick<PodcastGenerateRequest, "input_data_type" | "input_data" | "source_set"> =
    from.kind === "sources"
      ? { input_data_type: "full_content", input_data: "", source_set: from.sourceSet }
      : from.kind === "topic"
        ? { input_data_type: "topic", input_data: from.topic }
        : { input_data_type: "full_content", input_data: from.words };

  return {
    ...what,
    podcast_type: "educational",
    format: podFormat,
    theme,
    host_count: hostCount,
    language: (params.language as PodcastGenerateRequest["language"]) ?? "en-US",
    max_images: 0,
    max_videos: 0,
    tts_quality: "high_quality",
    prep_user_message: prep,
  };
}
