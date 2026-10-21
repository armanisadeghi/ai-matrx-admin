// features/connectors/first-party-connect-flow.ts
//
// THE TWO WAITS BEHIND "CONNECT GMAIL FROM THE CHAT" (defect C, round 2): wait for the host's consent
// dialog to be shown and then closed, and decide from a FRESH read of the account whether the grant
// landed. Pure over a store-shaped object and a reader, so both are tested without a browser.
//
// What the first version got wrong (reviewer, 2026-10-20):
//   - it gave up after 10 s if it had not SEEN the dialog open — a cold, lazy-loaded dialog is slower
//     than that on a bad connection, and a give-up read the account while the dialog was still up;
//   - it only noticed "open" on the next store change, so a dialog already open when it subscribed
//     was never seen opening;
//   - it re-read the account once and trusted that single answer, with no way to tell "nothing was
//     granted" from "the account list has not caught up yet".

export interface StoreLike {
  getState: () => unknown;
  subscribe: (listener: () => void) => () => void;
}

/** A dialog that never appears within this long did not open: nothing was connected. */
export const OPEN_WAIT_MS = 30_000;

export type OverlayOutcome = "closed" | "never_opened";

/**
 * Resolves `closed` once the overlay has been seen open and is closed again, or `never_opened` when it
 * does not appear within `openWaitMs`. Subscribes BEFORE the caller opens it and reads the current
 * state at once, so a dialog that is already up (or opens in the same tick) is seen.
 */
export function waitForOverlayClosed(
  store: StoreLike,
  isOpen: (state: unknown) => boolean,
  openWaitMs: number = OPEN_WAIT_MS,
): { done: Promise<OverlayOutcome>; cancel: () => void } {
  let seenOpen = false;
  let finished = false;
  let unsubscribe: () => void = () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolveOutcome: (outcome: OverlayOutcome) => void = () => undefined;
  const done = new Promise<OverlayOutcome>((resolve) => {
    resolveOutcome = resolve;
  });
  const finish = (outcome: OverlayOutcome) => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    unsubscribe();
    resolveOutcome(outcome);
  };
  const check = () => {
    const open = isOpen(store.getState());
    if (open) {
      seenOpen = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    } else if (seenOpen) {
      finish("closed");
    }
  };
  timer = setTimeout(() => {
    if (!seenOpen) finish("never_opened");
  }, openWaitMs);
  unsubscribe = store.subscribe(check);
  check();
  return { done, cancel: () => finish("never_opened") };
}

export interface AccountRead {
  /** Changes whenever a grant on any of the person's accounts changes. */
  fingerprint: string;
  /** The account now proves the connection (or the product) the person asked for. */
  proven: boolean;
}

/**
 * Decides, from fresh reads, whether the connect landed. `before` is what the account looked like when
 * the dialog opened: an unchanged fingerprint means nothing was granted, so there is nothing to wait
 * for (a cancel is answered at once). A changed one that does not yet prove the connection is read once
 * more after a short wait, because the list may not have caught up.
 */
export async function connectLanded(
  before: string,
  read: () => Promise<AccountRead>,
  options: { retryDelayMs?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const first = await read();
  if (first.proven) return true;
  if (first.fingerprint === before) return false;
  await wait(options.retryDelayMs ?? 1_200);
  return (await read()).proven;
}
