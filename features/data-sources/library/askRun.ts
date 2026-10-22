/**
 * One-time run tickets for the plain-language box (review C-1, 2026-10-22). An ask that should run gets a ticket
 * when it is made; the form takes it the first time it mounts for that ask, and a taken ticket never runs again —
 * not on Back and reopen, not on forward, not on any re-mount. A paid fetch the person did not ask for is never billed.
 */

let last = 0;
const armed = new Set<number>();

/** A new ask's id; `run` arms its one run. */
export function newAsk(run: boolean): number {
  const id = ++last;
  if (run) armed.add(id);
  return id;
}

/** True exactly once for an armed ask (the ticket is spent); false for every later call and any other id. */
export function takeAskRun(id: number | null | undefined): boolean {
  return id != null && armed.delete(id);
}

/** Leaving the asked source spends every ticket not yet taken. */
export function dropAskRuns(): void {
  armed.clear();
}
