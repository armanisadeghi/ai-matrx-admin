/**
 * Discovery — branches A and C (aidream `services/comparison/discover.py`): the person types a CONCEPT
 * ("best bike shops in Bend", "payroll software", "@handle competitors"), we find the list, they pick,
 * then the normal compare (branch B) runs on what they picked.
 *
 *   inferMode(text)          → "find" (a concept) | "compare" (a list) — the switch the box shows
 *   planDiscovery(...)       → POST /comparison/discover/plan — how the concept is read + points (free)
 *   discover(...)            → POST /comparison/discover (stream) — stages, then the found list
 *
 * Every found list carries its disclosure (how it was found, what that leans toward) — the page shows it.
 */

import { postJson, requestRaw } from "@/lib/python-client";
import { parseMatrxNdjsonResponse } from "@ai-matrx/api";

import { ComparisonRefusal, type ComparisonItemInput, type LookupMatch } from "./contract";
import { parseInput, type KindKey } from "./parse-input";

export type DiscoveryMode = "places" | "services" | "competitors" | "products" | "social";
export type InputMode = "find" | "compare";
export type Scope = "auto" | "local" | "nationwide";

export interface DiscoveryReading {
  kind: string;
  branch: "A" | "C";
  mode: DiscoveryMode;
  topic: string;
  area: string;
  platform: string;
  handle: string;
  of: string;
  priceMax: number | null;
  needs: "area" | null;
  summary: string;
  searches: number;
  points: number;
}

export interface DiscoveredItem {
  rank: number;
  match: LookupMatch;
  preselected: boolean;
  note: string;
}

export interface DiscoverResult {
  kind: string;
  reading: DiscoveryReading;
  disclosure: string;
  how: string[];
  guessed: boolean;
  items: DiscoveredItem[];
  searches: number;
  points: number;
  notes: string[];
}

export interface DiscoverRequest {
  text: string;
  kind?: string | null;
  area?: string | null;
  scope?: Scope;
}

// ── which mode the box is in ────────────────────────────────────────────────

/** Words that mark a concept even when the text holds a list separator ("best X and Y in Z"). */
const CONCEPT_CUE = /^(?:find|show me|search for|what are|which|who|best|top|cheapest|good|great|highest[- ]rated|most popular)\b|\b(?:competitors?|alternatives?|rivals|competes?|near me|nearby|creators|influencers|under \$|below \$)\b|@[a-z0-9_]/i;

/**
 * "find" when the text names ONE thing to look for (a concept), "compare" when it is a list of two or
 * more things. A single item can never be compared, so one segment is always a concept. Pure.
 */
export function inferMode(text: string, kind: KindKey): InputMode {
  const t = text.trim();
  if (!t) return "compare";
  if (CONCEPT_CUE.test(t) && !/\s(?:vs\.?|versus)\s|\n/i.test(t)) return "find";
  return parseInput(t, kind).items.length >= 2 ? "compare" : "find";
}

// ── the wire (defensive: untrusted) ─────────────────────────────────────────

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const MODES: readonly DiscoveryMode[] = ["places", "services", "competitors", "products", "social"];

export function parseReading(raw: unknown): DiscoveryReading {
  const o = obj(raw);
  const mode = MODES.find((m) => m === o.mode) ?? "services";
  return {
    kind: str(o.kind), branch: o.branch === "C" ? "C" : "A", mode,
    topic: str(o.topic), area: str(o.area), platform: str(o.platform), handle: str(o.handle), of: str(o.of),
    priceMax: numOrNull(o.price_max), needs: o.needs === "area" ? "area" : null,
    summary: str(o.summary), searches: num(o.searches), points: num(o.points),
  };
}

function parseItemInput(v: unknown): ComparisonItemInput {
  const o = obj(v);
  return {
    label: strOrNull(o.label), url: strOrNull(o.url),
    inputs: o.inputs && typeof o.inputs === "object" ? (o.inputs as Record<string, unknown>) : null,
    website: strOrNull(o.website), logo_url: strOrNull(o.logo_url),
  };
}

function parseMatch(v: unknown): LookupMatch {
  const o = obj(v);
  return {
    item: parseItemInput(o.item), name: str(o.name), detail: str(o.detail), logo_url: strOrNull(o.logo_url),
    website: strOrNull(o.website), url: strOrNull(o.url), rating: numOrNull(o.rating),
    reviews_count: numOrNull(o.reviews_count),
  };
}

export function parseDiscoverResult(raw: unknown): DiscoverResult | null {
  const o = obj(raw);
  if (!o.reading) return null;
  const items = Array.isArray(o.items) ? o.items.map((x) => {
    const i = obj(x);
    return { rank: num(i.rank), match: parseMatch(i.match), preselected: i.preselected === true, note: str(i.note) };
  }) : [];
  return {
    kind: str(o.kind), reading: parseReading(o.reading), disclosure: str(o.disclosure), how: strList(o.how),
    guessed: o.guessed === true, items, searches: num(o.searches), points: num(o.points), notes: strList(o.notes),
  };
}

export type DiscoverRead =
  | { kind: "stage"; label: string }
  | { kind: "result"; result: DiscoverResult }
  | { kind: "refusal"; refusal: ComparisonRefusal }
  | null;

export function readDiscoverEvent(evt: unknown): DiscoverRead {
  if (!evt || typeof evt !== "object") return null;
  const e = evt as { event?: string; data?: Obj };
  const d = e.data ?? {};
  if (e.event === "error") {
    const details = obj(d.details);
    return {
      kind: "refusal",
      refusal: new ComparisonRefusal(strOrNull(d.code) ?? strOrNull(details.code) ?? "discovery_failed",
        strOrNull(d.user_message) ?? strOrNull(details.user_message) ?? "That search did not answer. Try again."),
    };
  }
  if (e.event !== "data") return null;
  if (d.type === "discover_stage") return { kind: "stage", label: str(d.label) || "Searching" };
  if (d.type === "discover_result") {
    const result = parseDiscoverResult(d.result);
    return result ? { kind: "result", result } : null;
  }
  return null;
}

// ── calls ───────────────────────────────────────────────────────────────────

interface Ctx {
  organizationId: string;
  signal?: AbortSignal;
}

function org(organizationId: string): string {
  const id = organizationId?.trim();
  if (!id) throw new ComparisonRefusal("organization_required", "This organization is not loaded yet.");
  return id;
}

function body(req: DiscoverRequest) {
  return {
    text: req.text.trim(),
    ...(req.kind ? { kind: req.kind } : {}),
    ...(req.area?.trim() ? { area: req.area.trim() } : {}),
    scope: req.scope ?? "auto",
  };
}

/** How the concept is read and what finding it costs. Free: nothing is searched. */
export async function planDiscovery(req: DiscoverRequest, opts: Ctx): Promise<DiscoveryReading> {
  const { data } = await postJson<unknown>("/comparison/discover/plan", body(req), {
    organizationId: org(opts.organizationId), signal: opts.signal,
  });
  return parseReading(data);
}

/** Find the list. `onStage` hears each step ("Searching the map"). Resolves with the found list. */
export async function discover(req: DiscoverRequest, opts: Ctx & { onStage?: (label: string) => void }): Promise<DiscoverResult> {
  const response = await requestRaw(
    "/comparison/discover",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(req)) },
    { organizationId: org(opts.organizationId), signal: opts.signal, allowHttpError: true },
  );
  if (!response.ok) {
    let msg = "That search did not answer. Try again.";
    try {
      const b = obj(await response.json());
      const detail = obj(b.detail);
      msg = strOrNull(detail.user_message) ?? strOrNull(b.detail) ?? msg;
    } catch {
      // not JSON
    }
    throw new ComparisonRefusal(`http_${response.status}`, msg);
  }
  const parsed = parseMatrxNdjsonResponse(response, opts.signal);
  for await (const evt of parsed.events) {
    const read = readDiscoverEvent(evt);
    if (!read) continue;
    if (read.kind === "stage") opts.onStage?.(read.label);
    else if (read.kind === "refusal") throw read.refusal;
    else return read.result;
  }
  throw new ComparisonRefusal("stream_ended", "The search stopped before it answered. Try again.");
}
