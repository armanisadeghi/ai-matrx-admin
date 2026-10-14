/**
 * The "a notification is acting right now" signal the router guard reads.
 *
 * Raised while a toast's action/cancel runs (lib/toast wraps them) and for the
 * click task of any press inside a notice surface (NoticeSurfaceGuard). While
 * it is up, `router.push` / `router.replace` to another page opens a new tab
 * instead (NoticeRouterGuard). It covers the synchronous handler — the shape of
 * every toast "Open" — and the click's own task; a navigation after an `await`
 * is the static guard's job (`pnpm check:notice-new-tab`).
 */

let depth = 0;
let clickActive = false;

export function isNoticeActionActive(): boolean {
  return depth > 0 || clickActive;
}

/** Run `fn` as a notification's action: a page move inside it becomes a new tab. */
export function runAsNoticeAction<T>(fn: () => T): T {
  depth += 1;
  try {
    return fn();
  } finally {
    depth -= 1;
  }
}

/** A press landed inside a notice surface: hold the signal for the rest of this click task. */
export function markNoticeClick(): void {
  clickActive = true;
  setTimeout(() => {
    clickActive = false;
  }, 0);
}
