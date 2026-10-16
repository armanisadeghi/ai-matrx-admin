// components/dialogs/host/dialogHostsLatch.ts
//
// THE ENGAGEMENT LATCH for the app's imperative dialog hosts (file pickers, upload guard,
// manual copy, sandbox gate, value prompts, bulk Move/Share, scope mismatch, can't-remove,
// conversation rename). Zero React, zero imports: openers import it statically from
// everywhere, so it must stay this small.
//
// Nothing behind `<DialogHosts />` loads until the latch opens. It opens on the person's
// first engagement with the page (pointer, key, touch, drag, paste — wired by the shell) or
// when an opener is called first (`ensureDialogHosts()`). It never closes for the tab.

type Listener = () => void;

let requested = false;
let mounted = false;
const listeners = new Set<Listener>();
let mountedWaiters: Array<() => void> = [];

/** How long an opener waits for the hosts' chunk before falling through to its own no-host path. */
export const DIALOG_HOSTS_WAIT_MS = 15_000;

export function isDialogHostsRequested(): boolean {
  return requested;
}

export function subscribeDialogHosts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Opens the latch (idempotent). The shell renders the hosts' body on the next render. */
export function requestDialogHosts(): void {
  if (requested) return;
  requested = true;
  for (const listener of [...listeners]) listener();
}

/**
 * Opens the latch and resolves once every host has registered (or after `timeoutMs`, so a
 * caller never hangs — its own "no host" path then runs and says so). Server: resolves at once.
 */
export function ensureDialogHosts(timeoutMs = DIALOG_HOSTS_WAIT_MS): Promise<void> {
  if (typeof window === "undefined" || mounted) return Promise.resolve();
  requestDialogHosts();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      mountedWaiters = mountedWaiters.filter((w) => w !== done);
      resolve();
    }, timeoutMs);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    mountedWaiters.push(done);
  });
}

/** @internal Called by DialogHostsImpl after its children's register effects ran. */
export function markDialogHostsMounted(isMounted: boolean): void {
  mounted = isMounted;
  if (!isMounted) return;
  const waiters = mountedWaiters;
  mountedWaiters = [];
  for (const w of waiters) w();
}

/** @internal Tests only. */
export function _resetDialogHostsLatchForTests(): void {
  requested = false;
  mounted = false;
  mountedWaiters = [];
}
