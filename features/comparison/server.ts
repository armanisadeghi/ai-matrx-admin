/**
 * Compare — the compute door to aidream `/comparison`. Every call names the organization the
 * fetches run in and the raw tables land in (the cost lands there). Contract in `./contract.ts`;
 * the drop-safe run reader in `./settle.ts`.
 */

import { getJson, postJson, requestRaw } from "@/lib/python-client";
import { parseMatrxNdjsonResponse } from "@ai-matrx/api";

import {
  ComparisonRefusal,
  parseKinds,
  parseLookup,
  parseQuote,
  parseRunState,
  type ComparedItem,
  type ComparisonItemInput,
  type ComparisonKindInfo,
  type ComparisonQuote,
  type ComparisonResult,
  type ComparisonRunState,
  type LookupResult,
} from "./contract";
import { pollRun, settleComparison, type RunWatch } from "./settle";
import { withFacets } from "./facet-choice";

const BASE = "/comparison";

interface Ctx {
  organizationId: string;
  signal?: AbortSignal;
}

function org(organizationId: string): string {
  const id = organizationId?.trim();
  if (!id) throw new ComparisonRefusal("organization_required", "This organization is not loaded yet.");
  return id;
}

/** An HTTP failure from the client as a refusal with the server's own sentence. */
function asRefusal(err: unknown): unknown {
  const e = err as { status?: number; userMessage?: string; message?: string; code?: string };
  const status = typeof e?.status === "number" ? e.status : null;
  if (status === null) return err;
  if (status === 404 || status === 403) {
    return new ComparisonRefusal("not_found", "That comparison is not open to you.");
  }
  if (status >= 400 && status < 500) {
    return new ComparisonRefusal(typeof e.code === "string" ? e.code : `http_${status}`,
      e.userMessage ?? e.message ?? "The comparison could not be read.");
  }
  return new ComparisonRefusal(`http_${status}`, "The server is busy. Trying again.");
}

export async function getKinds(opts: Ctx): Promise<ComparisonKindInfo[]> {
  const { data } = await getJson<unknown>(BASE, { organizationId: org(opts.organizationId), signal: opts.signal });
  return parseKinds(data);
}

function itemBody(it: ComparisonItemInput) {
  return {
    ...(it.label ? { label: it.label } : {}),
    ...(it.url ? { url: it.url } : {}),
    ...(it.inputs ? { inputs: it.inputs } : {}),
    ...(it.website ? { website: it.website } : {}),
    ...(it.logo_url ? { logo_url: it.logo_url } : {}),
  };
}

function body(kind: string, items: ComparisonItemInput[], discovery?: Record<string, unknown> | null) {
  return { kind, items: items.map(itemBody), ...(discovery ? { discovery } : {}) };
}

/** "Here's what we found": each typed item matched to the real thing. Links are free. */
export async function lookupItems(kind: string, items: ComparisonItemInput[], opts: Ctx): Promise<LookupResult> {
  const { data } = await postJson<unknown>(`${BASE}/lookup`, body(kind, items), {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return parseLookup(data);
}

export async function quoteComparison(kind: string, items: ComparisonItemInput[], opts: Ctx): Promise<ComparisonQuote> {
  const { data } = await postJson<unknown>(`${BASE}/quote`, withFacets(body(kind, items)), {
    organizationId: org(opts.organizationId),
    signal: opts.signal,
  });
  return parseQuote(data);
}

export async function getRun(runId: string, opts: Ctx): Promise<ComparisonRunState> {
  let data: unknown;
  try {
    ({ data } = await getJson<unknown>(`${BASE}/runs/${encodeURIComponent(runId)}`, {
      organizationId: org(opts.organizationId),
      signal: opts.signal,
      // a run not open to this person, or a busy moment while following one, is answered on the
      // page (asRefusal) — never reported as an app failure
      captureErrors: false,
    }));
  } catch (err) {
    throw asRefusal(err);
  }
  const state = parseRunState(data);
  if (!state) throw new ComparisonRefusal("not_found", "That comparison is not open to you.");
  return state;
}

async function refusalFromResponse(response: Response): Promise<ComparisonRefusal> {
  let b: unknown = null;
  try {
    b = await response.json();
  } catch {
    // not JSON
  }
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const detail = o.detail && typeof o.detail === "object" ? (o.detail as Record<string, unknown>) : o;
  const code = typeof detail.code === "string" ? detail.code : `http_${response.status}`;
  const msg = typeof detail.user_message === "string" ? detail.user_message
    : typeof o.detail === "string" ? o.detail : `The server answered ${response.status}.`;
  return new ComparisonRefusal(code, msg);
}

/** Start a run and settle it: the stream while it lasts, the durable run after any drop. */
export async function runComparison(
  kind: string,
  items: ComparisonItemInput[],
  opts: Ctx & RunWatch & {
    /** How the list was found, when it came from a discovery (branch A/C) — the run keeps it. */
    discovery?: Record<string, unknown> | null;
  },
): Promise<ComparisonResult> {
  const response = await requestRaw(
    `${BASE}/run`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withFacets(body(kind, items, opts.discovery))) },
    { organizationId: org(opts.organizationId), signal: opts.signal, allowHttpError: true },
  );
  if (!response.ok) throw await refusalFromResponse(response);
  const reader = new AbortController();
  opts.signal?.addEventListener("abort", () => reader.abort(), { once: true });
  const parsed = parseMatrxNdjsonResponse(response, reader.signal);
  return settleComparison({
    events: parsed.events,
    onRunId: opts.onRunId,
    onProgress: opts.onProgress,
    onRunState: opts.onRunState,
    onDropped: opts.onDropped,
    signal: opts.signal,
    stopStream: () => reader.abort(),
    readRun: (runId, signal) => getRun(runId, { organizationId: opts.organizationId, signal }),
  });
}

/** Follow a run by its id alone (a refresh, a new tab, a dropped connection): read until it ends. */
export function followRun(runId: string, opts: Ctx & RunWatch & { signal: AbortSignal }): Promise<ComparisonResult> {
  return pollRun(runId, {
    signal: opts.signal,
    immediate: true,
    pollMs: 4000,
    onRunState: opts.onRunState,
    readRun: (id, signal) => getRun(id, { organizationId: opts.organizationId, signal }),
  });
}

/** What reading the page for "Is this them?" costs, asked before the person says yes. Free. */
/** The item an "Is this them?" answer names: its request position when the result has one, always its id. */
export type ConfirmItem = Pick<ComparedItem, "item_id" | "item_index">;

export async function getConfirmPrice(runId: string, item: ConfirmItem, facet: string, opts: Ctx): Promise<number> {
  try {
    const { data } = await getJson<unknown>(confirmPath(runId, item, facet), {
      organizationId: org(opts.organizationId), signal: opts.signal, captureErrors: false,
    });
    const points = (data as { points?: unknown } | null)?.points;
    return typeof points === "number" ? points : 0;
  } catch (err) {
    throw asRefusal(err);
  }
}

/** The run owner's answer: a page to use ({ url }) or "not them" ({ reject: true }). Returns the rebuilt run. */
export async function answerConfirm(
  runId: string, item: ConfirmItem, facet: string, answer: { url: string } | { reject: true }, opts: Ctx,
): Promise<ComparisonRunState> {
  let data: unknown;
  try {
    ({ data } = await postJson<unknown>(confirmPath(runId, item, facet), answer, {
      organizationId: org(opts.organizationId), signal: opts.signal, captureErrors: false,
    }));
  } catch (err) {
    throw asRefusal(err);
  }
  const state = parseRunState(data);
  if (!state) throw new ComparisonRefusal("not_found", "That comparison is not open to you.");
  return state;
}

/** The confirm address. A result saved before items carried their position names the item by id
 *  (`items/by-id/...?item_id=`) — never position 0, which would answer for another company. */
export function confirmPath(runId: string, item: ConfirmItem, facet: string): string {
  const at = typeof item.item_index === "number" ? String(item.item_index) : "by-id";
  return `${BASE}/runs/${encodeURIComponent(runId)}/items/${at}/facets/${encodeURIComponent(facet)}/confirm`
    + `?item_id=${encodeURIComponent(item.item_id)}`;
}
