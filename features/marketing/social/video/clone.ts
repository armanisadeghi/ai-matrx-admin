/**
 * The video studio's long doors (aidream): reference analysis, the clone plan, generation, the variant matrix and the
 * render batch. Typed-envelope streams (`{event, data}`) go through `postNdjson`; the generation and batch doors write
 * one plain `{type, ...}` JSON object per line, read here line by line. Every call names the brand's organization.
 */

import { parseHttpError } from "@ai-matrx/api";
import type { MusicBedMood, MusicBedTempo } from "@ai-matrx/media/video";

import { postJson, postNdjson, requestRaw } from "@/lib/python-client";

import type { EstimateAnswer, JsonDoc } from "./types";

interface CallOptions {
  organizationId: string;
  signal?: AbortSignal;
}

/** A refusal that arrived inside a stream after it opened. */
export class VideoStreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message || code);
    this.name = "VideoStreamError";
  }
}

export interface StageEvent {
  stage: string;
  label: string;
  current?: number;
  total?: number;
}

/** Read a typed-envelope stream: stages to `onStage`, the one result of `resultType` returned, an error thrown. */
async function typedStream<T>(
  path: string,
  body: unknown,
  stageType: string,
  resultType: string,
  o: CallOptions,
  onStage?: (s: StageEvent) => void,
): Promise<T> {
  let result: T | null = null;
  let refusal: VideoStreamError | null = null;
  for await (const evt of postNdjson(path, body, { organizationId: o.organizationId, signal: o.signal })) {
    const e = evt as { event?: string; data?: Record<string, unknown> };
    const d = e.data ?? {};
    if (e.event === "data" && d.type === stageType) {
      onStage?.({
        stage: String(d.stage ?? ""),
        label: String(d.label ?? d.stage ?? ""),
        current: typeof d.current === "number" ? d.current : undefined,
        total: typeof d.total === "number" ? d.total : undefined,
      });
    } else if (e.event === "data" && d.type === resultType) {
      result = d.result as T;
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

/** Read a plain NDJSON door: every line to `onEvent`, the events returned. */
async function lineStream(path: string, body: unknown, o: CallOptions, onEvent: (e: LineEvent) => void): Promise<LineEvent[]> {
  const response = await requestRaw(
    path,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    { organizationId: o.organizationId, signal: o.signal, allowHttpError: true },
  );
  if (!response.ok || !response.body) throw await parseHttpError(response);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const all: LineEvent[] = [];
  let buffer = "";
  const take = (line: string) => {
    const text = line.trim();
    if (!text) return;
    try {
      const evt = JSON.parse(text) as LineEvent;
      // The server writes a heartbeat line while it waits (the load balancer cuts a silent stream); it is not an event.
      if (evt.type === "heartbeat") return;
      all.push(evt);
      onEvent(evt);
    } catch {
      // A torn line is skipped; the next one carries on.
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      take(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf("\n");
    }
  }
  take(buffer);
  return all;
}

export type LineEvent = { type: string } & Record<string, unknown>;

// ── reference analysis ──────────────────────────────────────────────────────────────────────────────

export interface AnalysisCost {
  usd: number;
  display: string;
  points: number;
  not_billed: string[];
}

export interface AnalysisResult {
  analysis_id: string;
  post_id: string;
  status: "complete" | "reused";
  /** What the analysis spent; the server reports it in the result. */
  cost?: AnalysisCost;
  notes: string[];
}

export function analyzeReference(postId: string, o: CallOptions, onStage: (s: StageEvent) => void): Promise<AnalysisResult> {
  return typedStream<AnalysisResult>("/social/video-structure/analyze", { post_id: postId }, "video_analysis_stage", "video_analysis_result", o, onStage);
}

// ── the clone brief (the server's `CloneBrief`) ─────────────────────────────────────────────────────

export interface BriefFile {
  fileId: string;
  contentHash: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

export type PresenterMode = "voiceover" | "own_footage" | "generated_presenter";
export type CloneAspect = "9:16" | "1:1" | "4:5" | "16:9";

export interface ServerCloneBrief {
  title?: string;
  brand?: { id?: string; name: string };
  product?: { offeringId?: string; name: string; description?: string; price?: string; images?: BriefFile[]; markings?: string };
  subject?: string;
  presenter: {
    mode: PresenterMode;
    prompt?: string;
    voice?: string;
    images?: BriefFile[];
    takes?: Array<{ file: BriefFile }>;
  };
  script: { mode: "keep" | "rewrite" | "translate"; text?: string };
  hookLine?: string;
  captions: { mode: "match" | "preset" | "off"; preset?: string };
  aspect?: CloneAspect;
  /** Exactly one of a track the person uploaded or a bed made from a mood and a tempo. */
  music?: { file: BriefFile; bpm?: number } | { bed: { mood: MusicBedMood; tempo: MusicBedTempo } };
}

export interface ClonePlanNote {
  code: string;
  message: string;
}

export interface ClonePlanResult {
  project_id: string;
  version: number;
  analysis_id: string;
  post_id: string;
  script_source: "agent" | "person" | "fallback" | "kept";
  script_agent: "not_requested" | "ran" | "agent_not_built" | "failed";
  report: {
    notes?: ClonePlanNote[];
    presenter?: { mode: string; takes: number; videoSeconds: number };
    teleprompter?: Array<{ beat: string; role: string; lines: string[] }>;
  } & JsonDoc;
  estimate: EstimateAnswer & JsonDoc;
  /** What the brand's own record gave the plan; empty when the brief named no brand or product. */
  brand_facts?: BrandFactsUsed;
}

/** Counts and notes of what the director read from the brand (never the values). */
export interface BrandFactsUsed {
  facts?: number;
  has_voice?: boolean;
  product_images?: number;
  spokesperson_images?: number;
  spokesperson?: string | null;
  filled?: string[];
  notes?: string[];
}

export function runClonePlan(
  projectId: string,
  body: { brief: ServerCloneBrief; post_id?: string; base_version?: number },
  o: CallOptions,
  onStage: (s: StageEvent) => void,
): Promise<ClonePlanResult> {
  return typedStream<ClonePlanResult>(`/video-director/${projectId}/clone-plan`, body, "clone_plan_stage", "clone_plan_result", o, onStage);
}

export interface TeleprompterAnswer {
  teleprompter: Array<{ beat: string; role: string; lines: string[] }>;
  notes: ClonePlanNote[];
  words: number;
  /** The script the AI writer wrote for these lines (null when the person's own text was used). */
  script?: string | null;
  script_agent?: string;
}

export async function fetchTeleprompter(
  projectId: string,
  body: { brief: Partial<ServerCloneBrief>; post_id?: string },
  o: CallOptions,
): Promise<TeleprompterAnswer> {
  return (await postJson<TeleprompterAnswer>(`/video-director/${projectId}/teleprompter`, body, o)).data;
}

// ── generation ──────────────────────────────────────────────────────────────────────────────────────

export function streamGenerate(
  projectId: string,
  body: { version?: number; confirmed?: boolean; apply?: boolean },
  o: CallOptions,
  onEvent: (e: LineEvent) => void,
): Promise<LineEvent[]> {
  return lineStream(`/video-generation/${projectId}/generate`, body, o, onEvent);
}

// ── variants + render ───────────────────────────────────────────────────────────────────────────────

export interface ParamSet {
  label: string;
  hook_text?: string;
  caption_preset?: string;
  aspect?: CloneAspect;
}

export async function createVariantMatrix(projectId: string, variants: ParamSet[], o: CallOptions): Promise<{ variants: Array<{ id?: string; reused?: boolean }> }> {
  return (await postJson<{ variants: Array<{ id?: string; reused?: boolean }> }>(`/video-variants/${projectId}/matrix`, { variants }, o)).data;
}

/** What a batch would cost and how it would run, asked before anyone presses Render (nothing is generated, rendered or recorded). */
export interface BatchEstimate {
  variants: number;
  /** Variants whose overrides no longer apply: they would fail, so they are named before the run. */
  unrenderable: Array<{ variant_id: string; label: string | null; stage: string | null; error: string | null }>;
  /** Distinct generations the batch needs; a request shared by many variants counts once. */
  unique_requests: number;
  /** Of those, still to be made (the rest are reused for nothing). */
  to_generate: number;
  cache_hits: number;
  estimate_usd: number;
  estimate_points: number;
  /** The price if every variant paid for its own copy of a shared generation. */
  without_sharing_usd: number;
  confirm_over_points: number;
  will_ask: boolean;
  /** How many videos render at the same time; the rest wait. */
  render_cap: number;
  render_charged: boolean;
}

export async function estimateBatch(projectId: string, body: { variant_ids: string[]; head?: boolean }, o: CallOptions): Promise<BatchEstimate> {
  return (await postJson<BatchEstimate>(`/video-variants/${projectId}/estimate`, body, o)).data;
}

/** Item id of the project's own head inside a batch (`head: true`). */
export const HEAD_ITEM = "head";

export interface BatchVariantReport {
  variant_id: string;
  label: string | null;
  status: string;
  stage: string | null;
  error: string | null;
  cost_usd: number;
  points: number;
  output: { file_id?: string; run_id?: string; attach_error?: string } | null;
}

export function streamBatch(
  projectId: string,
  body: { variant_ids?: string[]; head?: boolean; confirmed?: boolean; renderer: "hosted" | "local" },
  o: CallOptions,
  onEvent: (e: LineEvent) => void,
): Promise<LineEvent[]> {
  return lineStream(`/video-variants/${projectId}/batch`, body, o, onEvent);
}

// ── money ───────────────────────────────────────────────────────────────────────────────────────────

export function points(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString()} pts`;
}
