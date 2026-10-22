/**
 * features/overlays/requestOverlay.ts — THE awaitable overlay: open a summon overlay and await its answer.
 *
 * The app's imperative dialogs (`openSandboxGate`, `promptScopeMismatch`, `showManualCopy`, …) are summon
 * overlays like every other one: declared once in `definitions/`, never in the tree until opened. Their
 * openers stay plain functions callable from thunks and package seams; this file is the one bridge from
 * such a call to summon's one-shot request handle (`createRequest`, `@ai-matrx/summon/handles`).
 *
 * The queue, dedupe, owner-disposal (closing any way answers `cancel`) and handle live in summon's
 * `requestOverlay` (`@ai-matrx/summon/request`, imported on the first ask so an opener costs no first-load
 * bytes); this file only opens/closes on the app store. Render modules answer with summon's
 * `useOverlayRequest` (`@ai-matrx/summon/react`).
 */
import { closeOverlay, openOverlay } from "@ai-matrx/summon/boot";
import { getStoreSingleton } from "@/lib/redux/store-singleton";

/** The open data every awaitable overlay carries: the request handle's id (and nothing else). */
export type { OverlayRequestData } from "@ai-matrx/summon/request";

export interface RequestOverlayOptions<Res> {
  /** The answer when the overlay closes unanswered (or cannot open at all). */
  cancel: Res;
  /** Same key while pending → same answer, no second dialog. */
  dedupeKey?: string;
  instanceId?: string;
}

/** summon's `requestOverlay` (`@ai-matrx/summon/request`, loaded on the first ask) opening on the app store. */
export async function requestOverlay<Req, Res>(
  overlayId: string,
  request: Req,
  options: RequestOverlayOptions<Res>,
): Promise<Res> {
  const store = getStoreSingleton();
  if (typeof window === "undefined" || !store) {
    console.error(`[overlays] "${overlayId}" was asked before the app store exists; answering cancel.`);
    return options.cancel;
  }
  const { requestOverlay: summonRequest } = await import("@ai-matrx/summon/request");
  return summonRequest<Req, Res>(overlayId, request, {
    ...options,
    open: ({ overlayId: id, instanceId, data }) => {
      store.dispatch(openOverlay({ overlayId: id, instanceId, data } as never));
    },
    close: ({ overlayId: id, instanceId }) => {
      store.dispatch(closeOverlay({ overlayId: id, instanceId } as never));
    },
  });
}
