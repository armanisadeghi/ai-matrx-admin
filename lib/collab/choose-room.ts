/**
 * Which co-editing room a Doc or Sheet opens in: the ordered log, or (never-flipped records only) the 0.6 relay.
 *
 * The question "does this record have an ordered room?" is a network call. When it FAILS, the answer is unknown, and
 * an unknown answer must never become "no": a relay seat on a flipped room writes saves the room never sees. So a
 * failed check is retried with backoff while the editor shows "Reconnecting…", until it answers (or the editor
 * closes). A device that holds unsent edits for the room (the package's own buffer rule) still opens the ordered
 * room at once, offline.
 */

export const ROOM_CHECK_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const;

export interface ChooseRoomOptions {
  /** The direct question: does the ordered room exist? Throws when it cannot be asked. */
  roomExists: () => Promise<boolean>;
  /** The package's full decision (room, knob, new-document rule, buffer on this device). Only trusted as `true` while the direct question fails. */
  usesOrderedRoom: () => Promise<boolean>;
  /** Called with true when the first check fails, false once it answers. Drives the "Reconnecting…" status. */
  onReconnecting: (reconnecting: boolean) => void;
  /** The editor closed: stop asking. */
  cancelled: () => boolean;
  sleep?: (ms: number) => Promise<void>;
  delays?: readonly number[];
}

/** `true` = ordered room, `false` = the relay (the record has no ordered room), `null` = the editor closed first. */
export async function chooseRoom(o: ChooseRoomOptions): Promise<boolean | null> {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const delays = o.delays ?? ROOM_CHECK_DELAYS_MS;
  let reconnecting = false;
  for (let attempt = 0; ; attempt++) {
    if (o.cancelled()) return null;
    try {
      const answer = (await o.roomExists()) ? true : await o.usesOrderedRoom();
      if (reconnecting) o.onReconnecting(false);
      return answer;
    } catch (err) {
      console.warn("[collab] could not ask whether this record has a co-editing room", err);
    }
    // The check failed. Unsent edits on this device (or a room that answers now) say the ordered room: go there.
    try {
      if (await o.usesOrderedRoom()) {
        if (reconnecting) o.onReconnecting(false);
        return true;
      }
    } catch {
      // still unknown
    }
    if (!reconnecting) {
      reconnecting = true;
      o.onReconnecting(true);
    }
    await sleep(delays[Math.min(attempt, delays.length - 1)] ?? 15000);
  }
}
