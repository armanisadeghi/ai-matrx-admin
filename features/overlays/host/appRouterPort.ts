/**
 * The app's summon RouterPort: one stable object that reads `window.location` until the Next router
 * port is mounted (AppSummonRuntime, after the summon core loads) and from then on forwards to it.
 * Stable identity: nothing that holds the ports ever restarts because the router arrived.
 */
import { locationRouter, type RouterPort } from "@ai-matrx/summon/boot-kit";

let current: RouterPort = locationRouter;
const listeners = new Set<() => void>();
let unsubscribe: (() => void) | null = null;

const notify = () => {
  for (const listener of [...listeners]) listener();
};

export const appRouterPort: RouterPort = {
  pathname: () => current.pathname(),
  search: () => current.search(),
  replaceSearch: (nextSearch) => current.replaceSearch(nextSearch),
  subscribe: (listener) => {
    listeners.add(listener);
    unsubscribe ??= current.subscribe(notify);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  },
};

/** Forward to `port` from now on (the Next router port). */
export function setAppRouterPort(port: RouterPort): void {
  if (port === current) return;
  unsubscribe?.();
  current = port;
  unsubscribe = listeners.size > 0 ? current.subscribe(notify) : null;
}
