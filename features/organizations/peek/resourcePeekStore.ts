/**
 * The resource-peek request store — tiny on purpose (the `personPeekStore` shape).
 *
 * WHY IT EXISTS: `EntityRef` names records on nearly every page. When every reference mounted its
 * own `ResourcePeekHost` (one `next/dynamic` edge), the peek world's chunk group was resolved in
 * ~480 entry contexts — the top HIGH-tier dynamic edge in `pnpm lab:graph`. Now a reference only
 * ASKS: `openResourcePeek({ kind, id, … })` writes here, and the ONE `ResourcePeekRoot` mounted in
 * `app/Providers.tsx` reads it and loads `ResourcePeekHostImpl` behind its single lazy edge on the
 * FIRST request — never before, so a page where nobody peeks loads nothing.
 *
 * No React, no Supabase, no peek UI: this module is in every route's boot bundle.
 */

export type ResourcePeekTrigger = "hover" | "click";

export interface ResourcePeekRequest {
  /** Peek catalogue key (`peekKeyForToken`) — what `PEEK_REGISTRY` / the entity registry answer for. */
  kind: string;
  /** The record's id. */
  id: string;
  /** The destination the CALLER resolved, when a token alone cannot name it (see `peekHrefOverride`). */
  href?: string | null;
  /** Called once when this peek closes (✕, Escape, outside click, or replaced). */
  onClose?: () => void;
  /** The reference that asked — an element or its rect (kept for placement and diagnostics). */
  anchor?: Element | DOMRect | null;
  trigger?: ResourcePeekTrigger;
  /**
   * Where the record opens when no peek host is mounted on this page (a shell without `Providers`):
   * the request then opens it in a new tab instead of doing nothing.
   */
  fallbackHref?: string | null;
  /** One open peek per key; a second request with the same key replaces it. Default `kind:id`. */
  key?: string;
}

export interface OpenResourcePeek extends ResourcePeekRequest {
  key: string;
}

let entries: readonly OpenResourcePeek[] = [];
let firstRequest: OpenResourcePeek | null = null;
let hostCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Ask the app's one peek host to show a record. Returns a function that closes THIS peek.
 * Returns `null` when no host is mounted on this page (a shell without `Providers`) — the caller
 * degrades (e.g. opens the record in a new tab) instead of leaving a door that does nothing.
 */
export function openResourcePeek(request: ResourcePeekRequest): (() => void) | null {
  if (hostCount === 0 && typeof window !== "undefined") {
    console.error(
      `[resource-peek] no peek host on this page — ${request.kind} ${request.id} cannot open in place` +
        (request.fallbackHref ? `; opening ${request.fallbackHref} in a new tab` : ""),
    );
    if (request.fallbackHref) window.open(request.fallbackHref, "_blank", "noopener,noreferrer");
    return null;
  }
  const key = request.key ?? `${request.kind}:${request.id}`;
  const next: OpenResourcePeek = { ...request, key };
  const replaced = entries.find((e) => e.key === key);
  entries = [...entries.filter((e) => e.key !== key), next];
  if (!firstRequest) firstRequest = next;
  emit();
  // The replaced request's owner is told it closed, unless it is the same owner re-asking.
  if (replaced && replaced.onClose !== next.onClose) replaced.onClose?.();
  return () => closeResourcePeek(key);
}

/** Close one peek by key (idempotent). Calls the request's `onClose` unless `notify: false`. */
export function closeResourcePeek(key: string, options?: { notify?: boolean }): void {
  const entry = entries.find((e) => e.key === key);
  if (!entry) return;
  entries = entries.filter((e) => e.key !== key);
  emit();
  if (options?.notify !== false) entry.onClose?.();
}

/** Close every open peek (the host does this when the route changes). */
export function closeAllResourcePeeks(): void {
  if (entries.length === 0) return;
  const closing = entries;
  entries = [];
  emit();
  for (const e of closing) e.onClose?.();
}

export function subscribeResourcePeek(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function getOpenResourcePeeks(): readonly OpenResourcePeek[] {
  return entries;
}

/** True once any peek has been requested this page load (latches) — the host's load gate. */
export function resourcePeekRequested(): boolean {
  return firstRequest !== null;
}

/** The request that first loaded the host, for the `[resource-peek] HOST LOADED` line. */
export function firstResourcePeekRequest(): OpenResourcePeek | null {
  return firstRequest;
}

/** `ResourcePeekRoot` registers itself while mounted, so a request knows someone will draw it. */
export function registerResourcePeekHost(): () => void {
  hostCount += 1;
  return () => {
    hostCount = Math.max(0, hostCount - 1);
  };
}
