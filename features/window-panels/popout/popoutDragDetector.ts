/**
 * popoutDragDetector — pure logic for "is the user dragging this window
 * out of the viewport hard enough to mean they want to pop it out?"
 *
 * **Threshold strategy:**
 *   1. Cursor must cross outside the viewport rect, AND
 *   2. Cursor must be at least `outsideThreshold` pixels past the edge
 *      (a deliberate intent signal, not a stray mouse twitch), AND
 *   3. Cursor must DWELL outside for at least `dwellMs` milliseconds
 *      (filters out drags that just transit through the edge en route
 *      to a different on-screen position).
 *
 * The dwell timer resets every time the cursor crosses back inside the
 * viewport — a glance outside doesn't latch the candidate state.
 *
 * **Return shape:**
 *   - `state` — the next `DragOutState` (replaces the previous on the next call)
 *   - `shouldTrigger` — true when the dwell threshold has just been met. The
 *     caller should fire popout on `pointerup`, NOT on this flag — the flag
 *     is purely for animation/visual feedback (`isCandidate`).
 *
 * Pure function: no DOM access, no side effects. Easy to unit test.
 */

export interface DragOutConfig {
  /** Pixels past the viewport edge before considering the drag "outside". */
  outsideThreshold: number;
  /** Milliseconds the cursor must remain outside before becoming a candidate. */
  dwellMs: number;
}

export interface DragOutState {
  /** Whether the dwell threshold is currently met (drives visual feedback). */
  isCandidate: boolean;
  /**
   * `performance.now()` timestamp when the cursor first crossed `outsideThreshold`.
   * `null` when the cursor is currently inside (or hasn't been outside yet).
   */
  outsideSinceMs: number | null;
}

export interface DragOutInput {
  clientX: number;
  clientY: number;
}

export interface DragOutEvalResult {
  state: DragOutState;
  /**
   * Edge-trigger: `true` ONLY on the first call where `isCandidate` flips
   * from `false` to `true`. Useful if a caller wants to dispatch a one-shot
   * action (e.g. haptic) on candidate entry.
   */
  shouldTrigger: boolean;
}

export const DEFAULT_DRAG_OUT_CONFIG: DragOutConfig = {
  outsideThreshold: 80,
  dwellMs: 250,
};

export const INITIAL_DRAG_OUT_STATE: DragOutState = {
  isCandidate: false,
  outsideSinceMs: null,
};

/**
 * Evaluate one pointermove event against the previous drag-out state.
 *
 * @param e   Pointer event coords (clientX/clientY are viewport-relative)
 * @param prev Previous state from the last call (or `INITIAL_DRAG_OUT_STATE`)
 * @param cfg Threshold config
 * @param vpW Current `window.innerWidth`
 * @param vpH Current `window.innerHeight`
 * @param now Current `performance.now()` reading
 */
export function evaluateDragOut(
  e: DragOutInput,
  prev: DragOutState,
  cfg: DragOutConfig,
  vpW: number,
  vpH: number,
  now: number,
): DragOutEvalResult {
  const { clientX, clientY } = e;
  const { outsideThreshold, dwellMs } = cfg;

  // Compute "how far past the edge" in each direction. Positive number = past
  // the edge by that many pixels.
  const pastLeft = -clientX; // clientX < 0 → past left edge
  const pastRight = clientX - vpW; // clientX > vpW → past right edge
  const pastTop = -clientY;
  const pastBottom = clientY - vpH;
  const maxPast = Math.max(pastLeft, pastRight, pastTop, pastBottom);

  const isOutsideEnough = maxPast >= outsideThreshold;

  if (!isOutsideEnough) {
    // Cursor is inside the viewport (or within the threshold band) — reset.
    if (prev.isCandidate || prev.outsideSinceMs !== null) {
      return {
        state: { isCandidate: false, outsideSinceMs: null },
        shouldTrigger: false,
      };
    }
    return { state: prev, shouldTrigger: false };
  }

  // Cursor is past the threshold. Two sub-cases:
  //   a) we just crossed the threshold this frame → start the dwell timer
  //   b) we've been outside for a while → check if dwell is met
  const outsideSince = prev.outsideSinceMs ?? now;
  const dwellMet = now - outsideSince >= dwellMs;
  const wasCandidate = prev.isCandidate;
  const nowCandidate = dwellMet;

  return {
    state: { isCandidate: nowCandidate, outsideSinceMs: outsideSince },
    shouldTrigger: !wasCandidate && nowCandidate,
  };
}
