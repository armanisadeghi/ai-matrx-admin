/**
 * ONE live viewer per run in this browser session.
 *
 * A control stream claim supersedes every earlier claim for the same run
 * (aidream `BrowserStreamService.claim`, `superseded_by_takeover`). Two
 * mounted viewers of one run — the Computer tab and a Cloud Browser pane —
 * therefore kicked each other off, and the one the person was typing in froze
 * (2026-10-16). Every component that opens a control stream holds the run's
 * viewer seat first; a second component sees the seat taken and stays passive.
 * An explicit press ("Take control again") moves the seat, and the old holder
 * is told at once so it drops its stream instead of renewing a dead claim.
 */

type Listener = () => void;

const seats = new Map<string, symbol>();
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

/** Who holds `runId`'s viewer seat right now, if anyone. */
export function runViewerHolder(runId: string): symbol | null {
  return seats.get(runId) ?? null;
}

/**
 * Take the seat. Without `steal`, succeeds only when it is free or already
 * this owner's. With `steal` (a person's press), it always succeeds.
 */
export function holdRunViewer(runId: string, owner: symbol, steal = false): boolean {
  const current = seats.get(runId);
  if (current === owner) return true;
  if (current && !steal) return false;
  seats.set(runId, owner);
  emit();
  return true;
}

export function releaseRunViewer(runId: string, owner: symbol): void {
  if (seats.get(runId) !== owner) return;
  seats.delete(runId);
  emit();
}

export function subscribeRunViewer(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only reset. */
export function resetRunViewersForTest(): void {
  seats.clear();
  listeners.clear();
}
