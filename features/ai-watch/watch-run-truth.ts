/**
 * WATCH AI — what the window may show for ONE run, decided from the run's own data.
 *
 * Arman (2026-10-13): "It cannot be guessing at the data and it cannot be creating a
 * separate instance of it. It has to get the actual data." So every rule here keys off
 * the run's SERVER id (`chat.user_request.id`), never a conversation and never a time:
 *
 *  - the run = every client request carrying that server id (a resume adds one);
 *  - its provider calls = the `context_analysis` wire captures whose `request_id` is
 *    that id — a sub-agent's calls on the same wire are its OWN nested runs;
 *  - a capture repeated by a rejoin (same request · iteration · attempt) counts once;
 *  - a retried attempt is marked superseded, never shown as the call that answered;
 *  - the live capture is kept; the recorded snapshot is shown only when no capture
 *    exists, labelled as a recorded copy (files as markers), and a record holding
 *    FEWER calls than were captured is an error, never a silent replacement;
 *  - the mandate identity is the run's own `mandate_run` frame (live, or the copy
 *    stored on its own row) — a turn with neither is NOT a mandate run.
 *
 * Pure (no network, no store): tests drive it with recorded frames.
 */

import type { ActiveRequest } from "@ai-matrx/chat/agents/types/request.types";
import type { MandateRunData } from "@ai-matrx/agents/generated/stream-events";

export interface WireCapture {
  provider?: string | null;
  model?: string | null;
  iteration?: number | null;
  attempt?: number | null;
  request_id?: string | null;
  conversation_id?: string | null;
  body?: Record<string, unknown> | null;
  body_raw?: string | null;
  body_size_bytes?: number | null;
}

export interface WatchCall {
  key: string;
  requestId: string | null;
  iteration: number | null;
  attempt: number | null;
  /** A later attempt of the same call exists: this one did not answer. */
  superseded: boolean;
  provider: string | null;
  model: string | null;
  body: Record<string, unknown> | null;
  raw: string | null;
  truncated: boolean;
  response: Record<string, unknown> | null;
}

export interface RunCaptures {
  /** This run's own provider calls, in wire order. */
  own: WatchCall[];
  /** Calls of OTHER requests on the same wire (sub-agents), by their request id. */
  children: Array<{ requestId: string; calls: WatchCall[] }>;
  /** Captures dropped as repeats of one already seen (a rejoin replay). */
  repeats: number;
}

const toCall = (c: WireCapture, i: number): WatchCall => ({
  key: `wire-${c.request_id ?? "?"}-${c.iteration ?? "?"}-${c.attempt ?? "?"}-${i}`,
  requestId: c.request_id ?? null,
  iteration: c.iteration ?? null,
  attempt: c.attempt ?? null,
  superseded: false,
  provider: c.provider ?? null,
  model: c.model ?? (typeof c.body?.model === "string" ? c.body.model : null),
  body: c.body ?? null,
  raw: c.body_raw ?? null,
  truncated: !c.body && Boolean(c.body_raw),
  response: null,
});

/** The `context_analysis` captures on a request's timeline, verbatim. */
export function capturesOf(request: ActiveRequest | undefined): WireCapture[] {
  const out: WireCapture[] = [];
  for (const entry of request?.timeline ?? []) {
    const e = entry as { kind: string; originalEvent?: string; rawData?: unknown };
    if (e.kind === "unknown" && e.originalEvent === "context_analysis" && e.rawData) {
      out.push(e.rawData as WireCapture);
    }
  }
  return out;
}

function markSuperseded(calls: WatchCall[]): WatchCall[] {
  const last = new Map<string, number>();
  for (const c of calls) {
    const k = `${c.requestId}|${c.iteration}`;
    last.set(k, Math.max(last.get(k) ?? 0, c.attempt ?? 1));
  }
  return calls.map((c) => ({
    ...c,
    superseded: (c.attempt ?? 1) < (last.get(`${c.requestId}|${c.iteration}`) ?? 1),
  }));
}

/**
 * Split the captures of a run's requests into its own calls and its children's.
 * `serverId` null (not bound yet) keeps every capture as this run's: the stream's
 * own `user_request` reservation precedes its first capture, so the id is bound
 * before any call could be misattributed.
 */
export function runCaptures(
  requests: ReadonlyArray<ActiveRequest | undefined>,
  serverId: string | null,
): RunCaptures {
  const seen = new Set<string>();
  let repeats = 0;
  const own: WatchCall[] = [];
  const childMap = new Map<string, WatchCall[]>();
  let i = 0;
  for (const request of requests) {
    for (const c of capturesOf(request)) {
      const id = `${c.request_id ?? ""}|${c.iteration ?? ""}|${c.attempt ?? ""}`;
      if (seen.has(id)) {
        repeats += 1;
        continue;
      }
      seen.add(id);
      const call = toCall(c, i++);
      if (!c.request_id || (serverId && c.request_id === serverId)) own.push(call);
      else if (!serverId) own.push(call);
      else (childMap.get(c.request_id) ?? childMap.set(c.request_id, []).get(c.request_id)!).push(call);
    }
  }
  return {
    own: markSuperseded(own),
    children: [...childMap.entries()].map(([requestId, calls]) => ({ requestId, calls: markSuperseded(calls) })),
    repeats,
  };
}

export interface RecordedSnapshot {
  id: string;
  iteration: number | null;
  provider: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
}

export interface RequestSource {
  /** `live`: the wire capture. `recorded`: the stored snapshot (a copy, files as markers). */
  source: "live" | "recorded" | "none";
  calls: WatchCall[];
  /** Set when the record holds fewer calls than the wire carried — shown as an error. */
  mismatch: { captured: number; recorded: number } | null;
}

/** Which request the window shows: the live capture first; the record only when none exists. */
export function chooseRequestSource(
  captured: WatchCall[],
  snapshots: ReadonlyArray<RecordedSnapshot>,
): RequestSource {
  const recordedAnswers = new Map(snapshots.map((s) => [s.iteration, s.responsePayload]));
  if (captured.length) {
    // Each call keeps its own recorded answer when the record has one (by iteration).
    const calls = captured.map((c) =>
      c.superseded ? c : { ...c, response: recordedAnswers.get(c.iteration) ?? null },
    );
    const answering = captured.filter((c) => !c.superseded).length;
    const mismatch =
      snapshots.length > 0 && snapshots.length < answering
        ? { captured: answering, recorded: snapshots.length }
        : null;
    return { source: "live", calls, mismatch };
  }
  if (snapshots.length) {
    return {
      source: "recorded",
      calls: snapshots.map((s) => ({
        key: s.id,
        requestId: null,
        iteration: s.iteration,
        attempt: null,
        superseded: false,
        provider: s.provider,
        model: typeof s.requestPayload?.model === "string" ? s.requestPayload.model : null,
        body: s.requestPayload,
        raw: null,
        truncated: false,
        response: s.responsePayload,
      })),
      mismatch: null,
    };
  }
  return { source: "none", calls: [], mismatch: null };
}

export interface MandateIdentity {
  frame: MandateRunData | null;
  /** Where it came from: the live stream, or the copy stored on the run's own row. */
  from: "stream" | "record" | null;
}

/**
 * The run's mandate identity: its own frame, live or stored — and ONLY when the
 * frame names this run. Never the conversation's mandate key, never a guess.
 */
export function mandateIdentity(
  live: ReadonlyArray<ActiveRequest | undefined>,
  recorded: MandateRunData | null,
  serverId: string | null,
): MandateIdentity {
  for (const r of live) {
    const f = r?.mandateRun;
    if (f && (!serverId || !f.request_id || f.request_id === serverId)) return { frame: f, from: "stream" };
  }
  if (recorded && (!serverId || !recorded.request_id || recorded.request_id === serverId)) {
    return { frame: recorded, from: "record" };
  }
  return { frame: null, from: null };
}
