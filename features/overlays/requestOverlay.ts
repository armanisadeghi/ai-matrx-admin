/**
 * features/overlays/requestOverlay.ts — THE awaitable overlay: open a summon overlay and await its answer.
 *
 * The app's imperative dialogs (`openSandboxGate`, `promptScopeMismatch`, `showManualCopy`, …) are summon
 * overlays like every other one: declared once in `definitions/`, never in the tree until opened. Their
 * openers stay plain functions callable from thunks and package seams; this file is the one bridge from
 * such a call to summon's one-shot request handle (`createRequest`, `@ai-matrx/summon/handles`).
 *
 * - The handle is owned by `overlayId:instanceId`, so closing the overlay any way at all (Esc, X, a route
 *   change, close-all) disposes it and the caller gets `cancel` — never a hang, never a silent default.
 * - `@ai-matrx/summon/handles` is imported on the first ask, so an opener costs no first-load bytes.
 * - One overlay shows one request at a time; later asks wait their turn (queue per overlay id).
 * - `dedupeKey`: a second ask with the same key while one is pending gets the same answer.
 *
 * The render module answers with `useOverlayRequest` (`./useOverlayRequest`).
 */
import { closeOverlay, openOverlay } from "@ai-matrx/summon/boot";
import { getStoreSingleton } from "@/lib/redux/store-singleton";

/** The open data every awaitable overlay carries: the request handle's id (and nothing else). */
export interface OverlayRequestData {
  requestId: string;
}

export interface RequestOverlayOptions<Res> {
  /** The answer when the overlay closes unanswered (or cannot open at all). */
  cancel: Res;
  /** Same key while pending → same answer, no second dialog. */
  dedupeKey?: string;
  instanceId?: string;
}

const queues = new Map<string, Promise<unknown>>();
const pending = new Map<string, Promise<unknown>>();

export function requestOverlay<Req, Res>(
  overlayId: string,
  request: Req,
  options: RequestOverlayOptions<Res>,
): Promise<Res> {
  const dedupe = options.dedupeKey === undefined ? null : `${overlayId}|${options.dedupeKey}`;
  if (dedupe) {
    const existing = pending.get(dedupe);
    if (existing) return existing as Promise<Res>;
  }
  const previous = queues.get(overlayId) ?? Promise.resolve();
  const answer = previous.then(() => ask<Req, Res>(overlayId, request, options));
  const settled = answer.catch(() => undefined);
  queues.set(overlayId, settled);
  void settled.then(() => {
    if (queues.get(overlayId) === settled) queues.delete(overlayId);
  });
  if (dedupe) {
    pending.set(dedupe, answer);
    void settled.then(() => pending.delete(dedupe));
  }
  return answer;
}

async function ask<Req, Res>(overlayId: string, request: Req, options: RequestOverlayOptions<Res>): Promise<Res> {
  const store = getStoreSingleton();
  if (typeof window === "undefined" || !store) {
    console.error(`[overlays] "${overlayId}" was asked before the app store exists; answering cancel.`);
    return options.cancel;
  }
  const instanceId = options.instanceId ?? "default";
  const { createRequest } = await import("@ai-matrx/summon/handles");
  const handle = createRequest<Req, Res>(request, { owner: `${overlayId}:${instanceId}` });
  store.dispatch(openOverlay({ overlayId, instanceId, data: { requestId: handle.id } } as never));
  try {
    return await handle.promise;
  } catch {
    return options.cancel;
  } finally {
    store.dispatch(closeOverlay({ overlayId, instanceId } as never));
  }
}
