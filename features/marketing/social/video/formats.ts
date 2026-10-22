/**
 * Starting formats (VC-09): the director's format doors. A format is a built-in reference structure the ONE clone plan
 * consumes, so a person can make a video without a reference post. The list and the live previews come from the server
 * (the engine that plans is the engine that previews); the video itself is made by `runFormatVideo`, which streams the
 * same typed events as the clone plan and returns the same result (plus the new project's id).
 */

import { getJson, postNdjson } from "@/lib/python-client";

import type { ClonePlanResult, ServerCloneBrief, StageEvent } from "./clone";
import { VideoStreamError } from "./clone";
import type { JsonDoc } from "./types";

interface CallOptions {
  organizationId: string;
  signal?: AbortSignal;
}

export type FormatId = "talking-head-ugc" | "two-person-podcast" | "street-interview" | "ranking-listicle" | "presenter-explainer" | "product-showcase";

export interface FormatInputSpec {
  key: "items" | "question" | "answers" | "points" | "comment" | "hostName" | "guestName";
  label: string;
  kind: "text" | "list" | "emoji-list" | "comment";
  required: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface FormatInfo {
  id: FormatId;
  label: string;
  summary: string;
  playbook: string;
  components: string[];
  captionPreset: string;
  presenters: Array<"voiceover" | "own_footage" | "generated_presenter">;
  needsProduct: boolean;
  inputs: FormatInputSpec[];
  beats: Array<{ role: string; summary: string; words: number }>;
  approxSeconds: number;
}

/** What a format asks beyond the brief (the server's `FormatInputs`). */
export interface FormatInputs {
  items?: Array<{ label: string; emoji?: string }>;
  question?: string;
  answers?: Array<{ emoji?: string; label?: string }>;
  points?: string[];
  comment?: { username: string; text: string; likes?: string };
  hostName?: string;
  guestName?: string;
}

export interface FormatPreviewAnswer {
  format: FormatInfo;
  sample: { brief: JsonDoc; inputs: FormatInputs };
  /** A ready-to-play composition: stand-in timing, labeled picture plates, no audio. Never stored. */
  composition: JsonDoc;
}

export async function listFormats(o: CallOptions): Promise<FormatInfo[]> {
  return (await getJson<{ formats: FormatInfo[] }>("/video-director/formats", { organizationId: o.organizationId, signal: o.signal })).data.formats;
}

export async function fetchFormatPreview(id: FormatId, o: CallOptions): Promise<FormatPreviewAnswer> {
  return (await getJson<FormatPreviewAnswer>(`/video-director/formats/${id}/preview`, { organizationId: o.organizationId, signal: o.signal })).data;
}

/**
 * Make the project from the format and plan it (the script is written from the brief unless it carries text). Streams
 * stages; the result names the new project. Nothing is generated or charged here.
 */
export async function runFormatVideo(
  body: { format_id: FormatId; brief: ServerCloneBrief; inputs?: FormatInputs; name?: string; brand_id?: string },
  o: CallOptions,
  onStage?: (s: StageEvent) => void,
): Promise<ClonePlanResult> {
  let result: ClonePlanResult | null = null;
  let refusal: VideoStreamError | null = null;
  for await (const evt of postNdjson("/video-director/from-format", body, { organizationId: o.organizationId, signal: o.signal })) {
    const e = evt as { event?: string; data?: Record<string, unknown> };
    const d = e.data ?? {};
    if (e.event === "data" && d.type === "clone_plan_stage") {
      onStage?.({ stage: String(d.stage ?? ""), label: String(d.label ?? d.stage ?? "") });
    } else if (e.event === "data" && d.type === "clone_plan_result") {
      result = d.result as ClonePlanResult;
    } else if (e.event === "error") {
      refusal = new VideoStreamError(
        String(d.code ?? d.error_type ?? "failed"),
        typeof d.user_message === "string" ? d.user_message : typeof d.message === "string" ? d.message : "That didn't work.",
      );
    }
  }
  if (refusal) throw refusal;
  if (result === null) throw new VideoStreamError("no_result", "The server ended without an answer.");
  return result;
}

/** "🌿 Hemp" lines -> items: a leading emoji is the picture, the rest the label (a line with no emoji is a label). */
export function parseEmojiLines(text: string): Array<{ emoji?: string; label: string }> {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*(.*)$/u.exec(line);
      return m ? { emoji: m[1]!, label: m[2]!.trim() } : { label: line };
    });
}

/** One entry per non-empty line. */
export function parseLines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}
