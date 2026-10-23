/**
 * F-D (adversarial walk 4): after the co-editing room finished joining, the tail of a word typed during the hold
 * still landed ("{JOIN2-0123456789abcdef}" became "123456789abcdef}"), a broken fragment. Keys refused while the
 * room joins are announced; the burst that was started during the hold must stay refused until the person pauses,
 * so a word is either all kept or all refused, never half.
 */

/** A pause this long after the last refused key ends the burst. */
export const TYPING_PAUSE_MS = 400;
/** The hold never outlasts this once the room is live, however long someone keeps typing. */
export const SETTLE_CAP_MS = 3000;

/** True when the hold after the room went live can be lifted: no key was refused, the burst paused, or the cap passed. */
export function holdCanLift(input: { now: number; lastRefusedAt: number; settleStartedAt: number }): boolean {
  if (input.lastRefusedAt <= 0) return true;
  if (input.now - input.lastRefusedAt >= TYPING_PAUSE_MS) return true;
  return input.now - input.settleStartedAt >= SETTLE_CAP_MS;
}
