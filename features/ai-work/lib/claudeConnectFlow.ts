/**
 * claudeConnectFlow — the Connect state machine for a Claude account.
 *
 * The server is start-then-poll: starting a sign-in answers at once, either
 * with the link (the sandbox is up) or with `state: "starting"` while the
 * sandbox boots in the background (a minute or two). This flow then polls the
 * hosted-runtime readiness with backoff and asks for the link again once it
 * says `ready`.
 *
 * Every wait has an end. Each call is bounded by `callTimeoutMs` and by the
 * overall deadline, and Cancel ends the flow at once, even mid-call. The flow
 * ends in exactly one of: signed in, awaiting the code (link in hand), failed
 * (the server's own reason), offline (the server could not be reached),
 * timeout (honest), or canceled.
 *
 * Pure of React and of the network: every effect is injected, so the state
 * machine is tested without either.
 */

import { formatDurationSeconds } from "@ai-matrx/kit/format";
import type { OwnPlanStatus } from "@/features/ai-work/lib/ownPlan";

export type ConnectReadiness = {
  state: "ready" | "provisionable" | "unavailable";
  reason?: string | null;
  /** The box's own ledger status ("creating", "starting", "running", "ready"), when it has one. */
  box_status?: string | null;
  /** The platform's start timing knobs (seconds); see {@link startTimingOf}. */
  cold_start_expected_seconds?: number | null;
  ready_wait_seconds?: number | null;
};

/**
 * How long a cold sandbox is expected to take and how long the platform waits for it, as the
 * SERVER says (knobs `coding_session_bridge.hosted_box_cold_start_expected_seconds` and
 * `.hosted_box_ready_wait_seconds`, returned with every starting and readiness answer). The
 * screen's deadline and its "how long" words come from these; there are no client constants.
 */
export type StartTiming = { expectedSeconds: number; waitSeconds: number };

export function startTimingOf(answer: object | null | undefined): StartTiming | null {
  // Server fields newer than the generated OwnPlanStatus type: read by name.
  const rec = (answer ?? {}) as { cold_start_expected_seconds?: unknown; ready_wait_seconds?: unknown };
  const expected = rec.cold_start_expected_seconds;
  const wait = rec.ready_wait_seconds;
  if (typeof expected !== "number" || typeof wait !== "number" || expected <= 0 || wait <= 0) return null;
  return { expectedSeconds: expected, waitSeconds: wait };
}

/** `240` -> "4 minutes", rounded up (the server builds its sentences the same way). */
export function minutesWords(seconds: number): string {
  // Round UP to the next whole minute (never under one): add 59 s, and the long voice floors to the minute.
  return formatDurationSeconds(Math.max(60, Math.ceil(seconds) + 59), { style: "long" });
}

/** What the screen says to expect while the sandbox starts (the measured knob). */
export function coldStartWords(timing: StartTiming): string {
  return `A cold start takes up to about ${minutesWords(timing.expectedSeconds)}.`;
}

/** The honest timeout, naming the deadline the server set. */
export function sandboxTimeoutMessage(timing: StartTiming): string {
  return `Your cloud sandbox did not finish starting within ${minutesWords(timing.waitSeconds)}. Try again; if it fails twice, the sandbox service is having trouble.`;
}

/** The server answered without its start timing: said, never papered over with a guess. */
export const NO_TIMING_MESSAGE =
  "AI Matrx did not say how long your cloud sandbox may take to start, so this screen cannot wait for it honestly. Reload the page and try again.";

/**
 * Where a Connect stands, so the screen can say what is happening instead of
 * one spinner: the sandbox is being created, it is up and its app is starting,
 * or Claude's sign-in link is being asked for.
 */
export type ConnectPhase = "sandbox" | "app" | "link";

const BOX_UP = new Set(["running", "ready"]);

/** The phase a readiness answer means. */
export function phaseOf(verdict: ConnectReadiness): ConnectPhase {
  if (verdict.state === "ready") return "link";
  return verdict.box_status && BOX_UP.has(verdict.box_status) ? "app" : "sandbox";
}

/**
 * The plain words for a phase: only what the server reported. The readiness door tells the box
 * being created/started apart from the box up with its app not answering yet, and from ready;
 * it reports no count of steps, so none is shown.
 */
export function phaseWords(phase: ConnectPhase): string {
  if (phase === "sandbox") return "Starting your cloud sandbox";
  if (phase === "app") return "Sandbox is up; its app is starting";
  return "Asking Claude for the sign-in link";
}

export type ConnectOutcome =
  | { kind: "signed_in"; status: OwnPlanStatus }
  | { kind: "awaiting"; status: OwnPlanStatus }
  | { kind: "failed"; message: string }
  | { kind: "offline"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "cancelled" };

export type ConnectDeps = {
  /** Start the sign-in. Answers at once: the link, or `state: "starting"`. */
  start: () => Promise<OwnPlanStatus>;
  /** The hosted runtime's readiness verdict (never boots anything). */
  readiness: () => Promise<ConnectReadiness>;
  /** Errors that must leave the flow untouched (e.g. the cap-full refusal). */
  isFatal: (cause: unknown) => boolean;
  /** The request never reached the server or got no answer (no HTTP status). */
  isNetwork: (cause: unknown) => boolean;
  describe: (cause: unknown) => string;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  now: () => number;
  signal: AbortSignal;
  callTimeoutMs?: number;
  /** Told each time the flow learns it moved to another phase (with the server's own sentence). */
  onPhase?: (phase: ConnectPhase, detail: string | null) => void;
  /** Told once, when the server first says how long the sandbox may take. */
  onTiming?: (timing: StartTiming) => void;
};

/** One request's longest wait. The server answers every connect call at once. */
export const CONNECT_CALL_TIMEOUT_MS = 25_000;
/** Consecutive unreachable answers before the flow says so instead of waiting. */
export const OFFLINE_AFTER = 3;
const FIRST_DELAY_MS = 1_500;
const MAX_DELAY_MS = 6_000;

export const OFFLINE_MESSAGE =
  "Could not reach AI Matrx. Check your connection, then try again.";

class CallTimedOut extends Error {}
class Cancelled extends Error {}

/** `call()`, but never longer than `ms`, and ended at once by `signal`. */
function bounded<T>(call: () => Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Cancelled());
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      reject(new CallTimedOut());
    }, Math.max(ms, 0));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Cancelled());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    call().then(
      (value) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (cause: unknown) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        reject(cause);
      },
    );
  });
}

export async function runClaudeConnect(deps: ConnectDeps): Promise<ConnectOutcome> {
  const began = deps.now();
  // The deadline is the server's ready wait, known from its first starting or readiness answer.
  // Until then only each call's own bound applies (the first answers come within seconds).
  let timing: StartTiming | null = null;
  let deadline = Number.POSITIVE_INFINITY;
  const learn = (answer: object) => {
    if (timing) return;
    const t = startTimingOf(answer);
    if (!t) return;
    timing = t;
    deadline = began + t.waitSeconds * 1000;
    deps.onTiming?.(t);
  };
  const timedOut = (): ConnectOutcome => ({ kind: "timeout", message: timing ? sandboxTimeoutMessage(timing) : NO_TIMING_MESSAGE });
  const giveUp = (): string => (timing ? sandboxTimeoutMessage(timing) : NO_TIMING_MESSAGE);
  const callMs = deps.callTimeoutMs ?? CONNECT_CALL_TIMEOUT_MS;
  const cancelled = (): boolean => deps.signal.aborted;
  const budget = () => Math.min(callMs, deadline - deps.now());

  let lastReason: string | null = null;
  let unreachable = 0;
  let readyStarts = 0;
  let phase: ConnectPhase | null = null;
  const moveTo = (next: ConnectPhase, detail: string | null) => {
    if (next === phase) return;
    phase = next;
    deps.onPhase?.(next, detail);
  };

  /** A failed call: rethrow what ends the flow, else remember why and go on. */
  const absorb = (cause: unknown): ConnectOutcome | null => {
    if (cause instanceof Cancelled || cancelled()) return { kind: "cancelled" };
    if (cause instanceof CallTimedOut || deps.isNetwork(cause)) {
      unreachable += 1;
      return unreachable >= OFFLINE_AFTER ? { kind: "offline", message: OFFLINE_MESSAGE } : null;
    }
    if (deps.isFatal(cause)) throw cause;
    return { kind: "failed", message: deps.describe(cause) };
  };

  // Returns an outcome when the attempt settles the flow, else null (keep waiting).
  const attempt = async (): Promise<ConnectOutcome | null> => {
    try {
      const status = await bounded(deps.start, budget(), deps.signal);
      unreachable = 0;
      if (status.signed_in) return { kind: "signed_in", status };
      if (status.sign_in_url) return { kind: "awaiting", status };
      learn(status);
      lastReason = status.detail ?? null;
      if (phase === null) moveTo("sandbox", lastReason);
      return null;
    } catch (cause) {
      return absorb(cause);
    }
  };

  const first = await attempt();
  if (first) return first;

  let delay = FIRST_DELAY_MS;
  while (!cancelled()) {
    if (deps.now() >= deadline) return timedOut();
    await deps.sleep(Math.min(delay, Math.max(deadline - deps.now(), 0)), deps.signal);
    if (cancelled()) break;
    if (deps.now() >= deadline) continue;
    delay = Math.min(Math.round(delay * 1.5), MAX_DELAY_MS);

    let verdict: ConnectReadiness;
    try {
      verdict = await bounded(deps.readiness, budget(), deps.signal);
      unreachable = 0;
    } catch (cause) {
      const settled = absorb(cause);
      if (settled) return settled;
      continue;
    }
    learn(verdict);
    if (verdict.state === "unavailable") {
      return { kind: "failed", message: verdict.reason || lastReason || giveUp() };
    }
    // Still starting and the server never said how long it may take: say so instead of waiting blind.
    if (!timing && verdict.state !== "ready") return { kind: "failed", message: NO_TIMING_MESSAGE };
    moveTo(phaseOf(verdict), verdict.reason ?? null);
    if (verdict.state !== "ready") continue;

    // The box answers: the sign-in can now give its link. Twice without one is
    // a real answer, not a cold start.
    readyStarts += 1;
    const next = await attempt();
    if (next) return next;
    if (readyStarts >= 2) {
      return { kind: "failed", message: lastReason || giveUp() };
    }
  }
  return { kind: "cancelled" };
}

// ---------------------------------------------------------------------------
// Finishing the sign-in: the pasted code
// ---------------------------------------------------------------------------
//
// The server answers a pasted code within seconds: signed in, Claude's own
// refusal (`awaiting_code` + detail; the same sign-in takes the next code), or
// `redeeming` while Claude is still checking it. `redeeming` is polled on the
// status door until it settles. The code is sent once and never resent.

export type RedeemOutcome =
  | { kind: "settled"; status: OwnPlanStatus }
  | { kind: "failed"; message: string }
  | { kind: "offline"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "cancelled" };

export type RedeemDeps = {
  /** Hand the code to the waiting sign-in (sent once, never retried). */
  submit: () => Promise<OwnPlanStatus>;
  /** The sign-in's current state; settles a code Claude is still checking. */
  status: () => Promise<OwnPlanStatus>;
  isNetwork: (cause: unknown) => boolean;
  describe: (cause: unknown) => string;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  now: () => number;
  signal: AbortSignal;
  timeoutMs?: number;
  callTimeoutMs?: number;
};

export const REDEEM_TIMEOUT_MS = 90_000;
/** The code hop's longest wait: the server's box lookup (≤12 s), its code
 * forward (18 s) and its protocol probe (10 s), under the ALB's 60 s cut. */
export const REDEEM_SUBMIT_TIMEOUT_MS = 45_000;
export const REDEEM_TIMEOUT_MESSAGE =
  "Claude did not answer about that code in time. Start the sign-in again.";
/** The code went out and no word from Claude came back. Never a guess at
 * Claude's verdict: only Claude's own words (`answer_to_code`) say refused. */
export const NO_WORD_FROM_CLAUDE_MESSAGE =
  "Couldn't hear back from Claude about that code. Paste it again to retry.";
/** The server's "Claude is still checking the code" state. Compared as a
 * string: the generated `OwnPlanState` union gains it on the next publish. */
export const REDEEMING_STATE = "redeeming";

export function isRedeeming(status: OwnPlanStatus): boolean {
  return String(status.state) === REDEEMING_STATE;
}

/** Claude's own words about the last pasted code (server field, newer than
 * the generated types), or null when Claude said nothing about it. */
export function claudeAnswerToCode(status: OwnPlanStatus): string | null {
  const answer = (status as { answer_to_code?: unknown }).answer_to_code;
  return typeof answer === "string" && answer.trim() ? answer : null;
}

/** When Claude gave that answer (server field, ISO-8601), or null. Kept with the
 * sign-in on the server, so a status poll shows the same words and time as the
 * code's own response did. */
export function claudeAnswerAt(status: OwnPlanStatus): string | null {
  const at = (status as { answer_to_code_at?: unknown }).answer_to_code_at;
  return typeof at === "string" && at ? at : null;
}

export async function runClaudeCodeRedeem(deps: RedeemDeps): Promise<RedeemOutcome> {
  const deadline = deps.now() + (deps.timeoutMs ?? REDEEM_TIMEOUT_MS);
  const callMs = deps.callTimeoutMs ?? CONNECT_CALL_TIMEOUT_MS;
  const submitMs = deps.callTimeoutMs ?? REDEEM_SUBMIT_TIMEOUT_MS;
  const budget = (ms: number) => Math.min(ms, deadline - deps.now());
  let unreachable = 0;

  // Reached only when the code's own answer did not come back directly (no
  // answer, or `redeeming`). A settled status then carries Claude's words in
  // `answer_to_code`, or nothing: in that case say so, never guess a verdict.
  const settle = (status: OwnPlanStatus): RedeemOutcome => {
    if (!status.signed_in && !claudeAnswerToCode(status)) {
      return { kind: "settled", status: { ...status, detail: NO_WORD_FROM_CLAUDE_MESSAGE } };
    }
    return { kind: "settled", status };
  };

  try {
    const status = await bounded(deps.submit, budget(submitMs), deps.signal);
    if (!isRedeeming(status)) return { kind: "settled", status };
  } catch (cause) {
    if (cause instanceof Cancelled || deps.signal.aborted) return { kind: "cancelled" };
    if (!(cause instanceof CallTimedOut || deps.isNetwork(cause))) {
      return { kind: "failed", message: deps.describe(cause) };
    }
    // No answer: the code may still be with Claude, so ask the status door.
    unreachable = 1;
  }

  let delay = 1_000;
  while (!deps.signal.aborted) {
    if (deps.now() >= deadline) return { kind: "timeout", message: REDEEM_TIMEOUT_MESSAGE };
    await deps.sleep(Math.min(delay, Math.max(deadline - deps.now(), 0)), deps.signal);
    if (deps.signal.aborted) break;
    if (deps.now() >= deadline) continue;
    delay = Math.min(Math.round(delay * 1.5), 3_000);
    try {
      const status = await bounded(deps.status, budget(callMs), deps.signal);
      unreachable = 0;
      if (!isRedeeming(status)) return settle(status);
    } catch (cause) {
      if (cause instanceof Cancelled || deps.signal.aborted) return { kind: "cancelled" };
      if (cause instanceof CallTimedOut || deps.isNetwork(cause)) {
        unreachable += 1;
        if (unreachable >= OFFLINE_AFTER) return { kind: "offline", message: OFFLINE_MESSAGE };
        continue;
      }
      return { kind: "failed", message: deps.describe(cause) };
    }
  }
  return { kind: "cancelled" };
}

// ---------------------------------------------------------------------------
// Surviving a reload
// ---------------------------------------------------------------------------
//
// The sign-in lives on the server (in the sandbox); only the page forgets it.
// The page keeps WHICH account slot it is signing in and since when (never the
// code), and on mount asks the server's status door where that sign-in is.

export type PendingConnect = {
  slot: string;
  /** When Connect was pressed (ms): the elapsed-time line counts from here. */
  startedAt: number;
  /** The account row it was started from (its email), so the reload shows the same row busy. */
  forEmail?: string | null;
  /** The server's ready wait (ms) once known, so a reload knows when the sign-in is too old. */
  waitMs?: number;
};

export const PENDING_CONNECT_KEY = "matrx:claude-connect-pending";

export function parsePendingConnect(raw: string | null): PendingConnect | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== "object" || value === null) return null;
    const { slot, startedAt } = value as Record<string, unknown>;
    if (typeof slot !== "string" || !slot || typeof startedAt !== "number" || !Number.isFinite(startedAt)) {
      return null;
    }
    const { forEmail, waitMs } = value as Record<string, unknown>;
    return {
      slot,
      startedAt,
      ...(typeof forEmail === "string" && forEmail ? { forEmail } : {}),
      ...(typeof waitMs === "number" && Number.isFinite(waitMs) && waitMs > 0 ? { waitMs } : {}),
    };
  } catch {
    return null;
  }
}

export type ResumeStep =
  /** The link is waiting: show it and the code field. */
  | { kind: "awaiting"; status: OwnPlanStatus }
  /** The sign-in finished while the page was away. */
  | { kind: "signed_in" }
  /** The sandbox was still starting: keep waiting for the link. */
  | { kind: "keep_starting" }
  /** Nothing to resume (ended, expired or cancelled): forget it. */
  | { kind: "forget" };

/** Where a remembered sign-in stands, from the server's own status answer. */
export function resumeStep(pending: PendingConnect, status: OwnPlanStatus, nowMs: number): ResumeStep {
  if (status.signed_in) return { kind: "signed_in" };
  if (status.sign_in_url && (status.state === "awaiting_code" || isRedeeming(status))) {
    return { kind: "awaiting", status };
  }
  // Unknown wait: keep starting, and the resumed flow learns the server's deadline from its answers.
  const young = pending.waitMs === undefined || nowMs - pending.startedAt < pending.waitMs;
  if (young && (status.state === "starting" || status.state === "unavailable" || status.state === "signed_out")) {
    // The box was still booting when the page went away: the link is not out yet.
    return { kind: "keep_starting" };
  }
  return { kind: "forget" };
}

