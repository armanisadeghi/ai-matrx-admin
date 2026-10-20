/** Wheel-to-flip re-arm rule shared by the one-page PDF renderer. */

// A trackpad's momentum tail only DECAYS. Waiting for the wheel to go quiet
// alone meant a reader swiping again before the tail ended never re-armed —
// one page flipped, then every later swipe did nothing (found 2026-10-20 on
// a Mac trackpad). While locked, a delta that jumps back up by this ratio
// (and past the floor), long enough after the flip, is a NEW swipe.
const REARM_RATIO = 1.6;
const REARM_MIN_DELTA = 8;
const REARM_MIN_MS = 250;

export interface WheelRearmSample {
  /** A flip already fired for the current gesture. */
  locked: boolean;
  /** |deltaY| of this wheel event. */
  abs: number;
  /** |deltaY| of the previous wheel event in the same direction. */
  lastAbs: number;
  /** Milliseconds since the last flip fired. */
  sinceFlipMs: number;
}

/** True when a locked gesture should be treated as a fresh swipe. */
export function shouldRearmWheel({
  locked,
  abs,
  lastAbs,
  sinceFlipMs,
}: WheelRearmSample): boolean {
  return (
    locked &&
    abs >= REARM_MIN_DELTA &&
    abs > lastAbs * REARM_RATIO &&
    sinceFlipMs >= REARM_MIN_MS
  );
}
