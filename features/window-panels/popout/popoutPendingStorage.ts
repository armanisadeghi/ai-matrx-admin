/**
 * popoutPendingStorage — sessionStorage flag tracking which window(s) were
 * popped out at the time of the last parent-page unload.
 *
 * **Why:** browsers require a fresh user gesture to call
 * `documentPictureInPicture.requestWindow()` or `window.open()`. We can't
 * programmatically restore a popout on hydration; the user has to click
 * something. To make the recovery discoverable, we surface a toast on
 * reload: "X was popped out — click to restore."
 *
 * **Storage key:** `matrx_popout_pending` (sessionStorage, JSON-encoded
 * `{ windowIds: string[] }`).
 *
 * **Lifecycle:**
 *  1. While a popout is open, `usePopoutWindow` writes the window id into
 *     this storage on every open (idempotent set semantics).
 *  2. On dock-back / close, the id is removed.
 *  3. On parent reload: the storage entry persists across the reload (it's
 *     in sessionStorage, scoped to the tab).
 *  4. The `WindowPersistenceManager` reads the entry after hydration and
 *     surfaces a toast for each pending window.
 *  5. Toast click triggers `usePopoutControl.popOut()` from the click
 *     handler (a fresh user gesture), satisfying browser policy.
 *
 * SSR-safe: every function checks `typeof window` before touching storage.
 */

const STORAGE_KEY = "matrx_popout_pending";

interface PendingState {
  windowIds: string[];
}

function readState(): PendingState {
  if (typeof window === "undefined") return { windowIds: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { windowIds: [] };
    const parsed = JSON.parse(raw) as Partial<PendingState>;
    if (!Array.isArray(parsed.windowIds)) return { windowIds: [] };
    // Filter to strings — defensive against tampered storage.
    return {
      windowIds: parsed.windowIds.filter(
        (id): id is string => typeof id === "string",
      ),
    };
  } catch {
    return { windowIds: [] };
  }
}

function writeState(state: PendingState): void {
  if (typeof window === "undefined") return;
  try {
    if (state.windowIds.length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Storage may be disabled (private mode, quota exceeded). Failing
    // silently means we lose the recovery toast UX, but everything else
    // keeps working.
  }
}

/** Mark a window as popped out so it can be recovered on reload. */
export function markPopoutPending(windowId: string): void {
  const state = readState();
  if (!state.windowIds.includes(windowId)) {
    state.windowIds.push(windowId);
    writeState(state);
  }
}

/** Clear the pending flag for a window (called on dock-back / close). */
export function clearPopoutPending(windowId: string): void {
  const state = readState();
  const next = state.windowIds.filter((id) => id !== windowId);
  if (next.length !== state.windowIds.length) {
    writeState({ windowIds: next });
  }
}

/** Read all pending window ids (used on hydration to surface the toast). */
export function getPendingPopoutWindowIds(): string[] {
  return readState().windowIds;
}

/** Clear ALL pending entries — used after surfacing the recovery toast. */
export function clearAllPopoutPending(): void {
  writeState({ windowIds: [] });
}
