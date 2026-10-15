/**
 * After a record is trashed from inside its own editor, the person must land
 * on the list. `router.push` can stall (a slow route compile, a blocked
 * transition), leaving the trashed record open with only a toast. So: push,
 * then if the editor is STILL the current page after a grace period, navigate
 * hard. One place, used by every editor's File menu (Workbooks and Documents).
 */

export interface LeaveDeps {
  push: (href: string) => void;
  /** The current location's pathname. */
  currentPath: () => string;
  hardNavigate: (href: string) => void;
  /** Injected so a test can drive time. */
  later: (fn: () => void, ms: number) => void;
}

export const LEAVE_GRACE_MS = 2500;

/**
 * `deps.push` should REPLACE the history entry (a Back press must not return to the trashed record's
 * "In Trash" gate). After the grace period anyone still NOT on the list — the editor, or the page's own
 * "In Trash" screen that swaps in at the same address — is sent there hard (review 2026-10-15: a
 * workbook and a presentation trashed from inside their editors stayed on that screen; Documents did not).
 */
export function leaveTrashedRecord(listHref: string, _recordHref: string, deps: LeaveDeps): void {
  deps.push(listHref);
  deps.later(() => {
    if (deps.currentPath() !== listHref) deps.hardNavigate(listHref);
  }, LEAVE_GRACE_MS);
}
