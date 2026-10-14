/**
 * Smart Add helpers — the one place a helper session lives, outside any window, so a panel can be
 * closed and reopened (the LinkedIn search keeps running and polling meanwhile).
 *
 * - `helperContext`: what the Smart Add page currently knows (name, city, occupation, company) —
 *   panels prefill from it.
 * - `sessions[method]`: input, status, result, timing, error.
 * - `answers`: "This is me / Not me / Namesake" from a panel → the Smart Add page applies it through
 *   the same path the anchor cards use (SmartAddBrand subscribes while mounted).
 *
 * A LinkedIn job's snapshot id is also kept in sessionStorage so a page reload can resume polling.
 */
import { useSyncExternalStore } from "react";
import { extractErrorMessage } from "@/utils/errors";
import { cancelLinkedinJob, pollLinkedinJob, runHelper } from "./service";
import type { HelperCandidate, HelperInput, HelperMethod, HelperResult } from "./types";
import { EMPTY_INPUT } from "./types";
import type { AnchorAnswer } from "../AnchorCards";

export interface HelperSession {
  input: HelperInput;
  status: "idle" | "running" | "polling" | "done" | "failed" | "cancelled" | "needs_confirm";
  result: HelperResult | null;
  /** The first answer (LinkedIn: the Google half) kept while the dataset job runs. */
  partial: HelperResult | null;
  startedAt: number | null;
  /** Wall time measured in the browser, start to final answer. */
  elapsedMs: number | null;
  error: string | null;
}

const POLL_MS = 5_000;
const JOB_KEY = "smart-add.helpers.linkedin-job";

let context: HelperInput = EMPTY_INPUT;
let sessions: Partial<Record<HelperMethod, HelperSession>> = {};
const listeners = new Set<() => void>();
const answerListeners = new Set<(candidate: HelperCandidate, answer: AnchorAnswer | null) => void>();
const answers = new Map<string, AnchorAnswer>();
let polling: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function blank(): HelperSession {
  return { input: { ...context }, status: "idle", result: null, partial: null, startedAt: null, elapsedMs: null, error: null };
}

function set(method: HelperMethod, patch: Partial<HelperSession>) {
  sessions = { ...sessions, [method]: { ...(sessions[method] ?? blank()), ...patch } };
  emit();
}

export function setHelperContext(next: HelperInput) {
  if (JSON.stringify(next) === JSON.stringify(context)) return;
  context = next;
  // Idle panels follow the page; a panel that already ran keeps what it searched.
  for (const [m, s] of Object.entries(sessions)) {
    if (s && s.status === "idle") sessions = { ...sessions, [m]: { ...s, input: { ...next } } };
  }
  emit();
}

const SERVER_BLANK: HelperSession = { input: EMPTY_INPUT, status: "idle", result: null, partial: null, startedAt: null, elapsedMs: null, error: null };

/** The method's session, created (without notifying) the first time a panel reads it. */
function sessionOf(method: HelperMethod): HelperSession {
  const cur = sessions[method];
  if (cur) return cur;
  const fresh = blank();
  sessions = { ...sessions, [method]: fresh };
  return fresh;
}

export function useHelperSession(method: HelperMethod): HelperSession {
  return useSyncExternalStore(
    subscribe,
    () => sessionOf(method),
    () => SERVER_BLANK,
  );
}

export function setHelperInput(method: HelperMethod, input: HelperInput) {
  set(method, { input });
}

function finish(method: HelperMethod, result: HelperResult) {
  const s = sessions[method];
  const elapsedMs = s?.startedAt ? Date.now() - s.startedAt : result.ms;
  const status = result.status === "running" ? "polling" : result.status;
  set(method, { result, status, elapsedMs: status === "polling" ? null : elapsedMs, error: result.error });
}

export async function startHelper(method: HelperMethod, confirm = false) {
  const s = sessions[method] ?? blank();
  if (!s.input.name.trim()) return;
  set(method, { status: "running", startedAt: Date.now(), elapsedMs: null, error: null, result: null, partial: null });
  try {
    const result = await runHelper(method, s.input, confirm);
    if (method === "linkedin" && result.status === "running" && result.job?.snapshot_id) {
      sessionStorage.setItem(JOB_KEY, JSON.stringify({ snapshot: result.job.snapshot_id, startedAt: sessions[method]?.startedAt, input: s.input }));
      set(method, { partial: result, result, status: "polling", error: result.error });
      schedulePoll(String(result.job.snapshot_id));
      return;
    }
    finish(method, result);
  } catch (error) {
    set(method, { status: "failed", error: extractErrorMessage(error), elapsedMs: Date.now() - (s.startedAt ?? Date.now()) });
  }
}

function merged(partial: HelperResult | null, job: HelperResult): HelperResult {
  if (!partial) return job;
  // Union by profile address (the server keys candidates the same way): dataset rows first, Google fills gaps.
  const byKey = new Map<string, HelperCandidate>();
  for (const c of [...job.candidates, ...partial.candidates]) {
    const cur = byKey.get(c.key);
    if (!cur) {
      byKey.set(c.key, { ...c });
      continue;
    }
    byKey.set(c.key, {
      ...cur,
      name: cur.name ?? c.name,
      headline: cur.headline ?? c.headline,
      location: cur.location ?? c.location,
      employer: cur.employer ?? c.employer,
      image_url: cur.image_url ?? c.image_url,
      snippet: cur.snippet ?? c.snippet,
      sources: [...new Set([...cur.sources, ...c.sources])],
      hits: [...cur.hits, ...c.hits],
    });
  }
  return {
    ...job,
    candidates: [...byKey.values()],
    queries: [...partial.queries, ...job.queries],
    costs: [...partial.costs, ...job.costs],
    requests: [...partial.requests, ...job.requests],
    points: partial.points == null || job.points == null ? null : partial.points + job.points,
    error: [partial.error, job.error].filter(Boolean).join("; ") || null,
  };
}

function schedulePoll(snapshot: string) {
  if (polling) clearTimeout(polling);
  polling = setTimeout(() => void poll(snapshot), POLL_MS);
}

async function poll(snapshot: string) {
  polling = null;
  const s = sessions.linkedin;
  if (!s || s.status !== "polling") return;
  try {
    const job = await pollLinkedinJob(snapshot);
    if (sessions.linkedin?.status !== "polling") return;
    if (job.status === "running") {
      set("linkedin", { result: { ...merged(s.partial, job), status: "running" } });
      schedulePoll(snapshot);
      return;
    }
    sessionStorage.removeItem(JOB_KEY);
    finish("linkedin", merged(s.partial, job));
  } catch (error) {
    // A failed poll is reported and retried: the job keeps running at the data source.
    set("linkedin", { error: `Progress check failed: ${extractErrorMessage(error)}` });
    schedulePoll(snapshot);
  }
}

/** Google / Facebook / Instagram: one more page (SerpAPI `start` paging), merged into what is shown. One search. */
export async function moreGoogle(method: HelperMethod = "google") {
  const s = sessions[method];
  if (!s?.result?.more || s.status === "running") return;
  const page = s.result.page + 1;
  const prev = s.result;
  set(method, { status: "running", error: null });
  const t0 = Date.now();
  try {
    const next = await runHelper(method, s.input, false, page);
    const byKey = new Map<string, HelperCandidate>(prev.candidates.map((c) => [c.key, c]));
    for (const c of next.candidates) if (!byKey.has(c.key)) byKey.set(c.key, c);
    const groups: Record<string, HelperCandidate[]> = {};
    for (const [k, list] of Object.entries(prev.groups)) groups[k] = [...list];
    for (const [k, list] of Object.entries(next.groups)) {
      const have = new Set((groups[k] ?? []).map((c) => c.key));
      groups[k] = [...(groups[k] ?? []), ...list.filter((c) => !have.has(c.key))];
    }
    set(method, {
      status: "done",
      elapsedMs: (s.elapsedMs ?? 0) + (Date.now() - t0),
      error: next.error,
      result: {
        ...next,
        candidates: [...byKey.values()],
        groups,
        filtered_aggregators: [...new Set([...prev.filtered_aggregators, ...next.filtered_aggregators])],
        queries: [...prev.queries, ...next.queries],
        costs: [...prev.costs, ...next.costs],
        requests: [...prev.requests, ...next.requests],
        ms: prev.ms + next.ms,
        points: prev.points == null || next.points == null ? null : prev.points + next.points,
      },
    });
  } catch (error) {
    set(method, { status: "done", error: extractErrorMessage(error) });
  }
}

export async function cancelHelper(method: HelperMethod) {
  const s = sessions[method];
  if (method !== "linkedin" || !s) {
    set(method, { status: "cancelled" });
    return;
  }
  const snapshot = s.result?.job?.snapshot_id;
  if (polling) clearTimeout(polling);
  polling = null;
  sessionStorage.removeItem(JOB_KEY);
  set(method, { status: "cancelled", elapsedMs: s.startedAt ? Date.now() - s.startedAt : null });
  if (snapshot) {
    try {
      const r = await cancelLinkedinJob(String(snapshot));
      set(method, { error: r.error, result: s.partial ? { ...s.partial, status: "cancelled", requests: [...s.partial.requests, ...r.requests] } : r });
    } catch (error) {
      set(method, { error: `Cancel failed: ${extractErrorMessage(error)}` });
    }
  }
}

/** After a reload: resume a LinkedIn job that was still running. */
export function resumeLinkedinJob() {
  if (sessions.linkedin && sessions.linkedin.status !== "idle") return;
  try {
    const raw = sessionStorage.getItem(JOB_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { snapshot: string; startedAt: number | null; input: HelperInput };
    set("linkedin", { input: saved.input, status: "polling", startedAt: saved.startedAt, partial: null });
    schedulePoll(saved.snapshot);
  } catch {
    sessionStorage.removeItem(JOB_KEY);
  }
}

// ── answers → the Smart Add round ──────────────────────────────────────────

export function answerCandidate(candidate: HelperCandidate, answer: AnchorAnswer | null) {
  if (answer) answers.set(candidate.key, answer);
  else answers.delete(candidate.key);
  emit();
  for (const l of answerListeners) l(candidate, answer);
}

export function useHelperAnswer(key: string): AnchorAnswer | null {
  return useSyncExternalStore(subscribe, () => answers.get(key) ?? null, () => null);
}

export function onHelperAnswer(listener: (candidate: HelperCandidate, answer: AnchorAnswer | null) => void) {
  answerListeners.add(listener);
  return () => {
    answerListeners.delete(listener);
  };
}

/** A new person (Smart Add reset): helper answers start over. */
export function resetHelperAnswers() {
  if (!answers.size) return;
  answers.clear();
  emit();
}
