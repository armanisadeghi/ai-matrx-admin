// providers/meetHostDemand.ts
//
// Something engaged with Meet before the late tier opened (a DM thread was opened, so its call
// invitation chips need the call runtime). One module-level flag with subscribers; `<MeetHost>`
// reads it. Idempotent and never un-demanded within a tab.

import { useSyncExternalStore } from "react";

let demanded = false;
const listeners = new Set<() => void>();

export function demandMeetHost(): void {
  if (demanded) return;
  demanded = true;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMeetHostDemanded(): boolean {
  return useSyncExternalStore(subscribe, () => demanded, () => false);
}

/** Test seam: forget a demand between cases. */
export function resetMeetHostDemandForTests(): void {
  demanded = false;
}
