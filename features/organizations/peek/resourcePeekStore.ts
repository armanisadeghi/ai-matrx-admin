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
   * Where the record opens when no peek host registers within `RESOURCE_PEEK_HOST_WAIT_MS` (a shell
   * without `Providers`): the request then opens it in a new tab instead of doing nothing.
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

/**
 * How long a request waits for a host before it falls back (2026-10-18, adversarial IMPORTANT-3).
 * `ResourcePeekRoot` registers in an effect, and it mounts AFTER `{children}` in `app/Providers.tsx`,
 * so on the first commit every child effect that asks for a peek runs before the host exists. Such a
 * request is QUEUED and drawn the moment the host registers; only when no host arrives within this
 * window (a shell with no `Providers`) does it open the record in a new tab.
 */
export const RESOURCE_PEEK_HOST_WAIT_MS = 1000;

let pending: readonly OpenResourcePeek[] = [];
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  for (const l of listeners) l();
}

function keyOf(request: ResourcePeekRequest): string {
  return request.key ?? `${request.kind}:${request.id}`;
}

function show(next: OpenResourcePeek): void {
  const replaced = entries.find((e) => e.key === next.key);
  entries = [...entries.filter((e) => e.key !== next.key), next];
  if (!firstRequest) firstRequest = next;
  emit();
  // The replaced request's owner is told it closed, unless it is the same owner re-asking.
  if (replaced && replaced.onClose !== next.onClose) replaced.onClose?.();
}

function giveUpWaiting(): void {
  pendingTimer = null;
  if (hostCount > 0) return;
  const stranded = pending;
  pending = [];
  for (const request of stranded) {
    console.error(
      `[resource-peek] no peek host on this page after ${RESOURCE_PEEK_HOST_WAIT_MS} ms — ${request.kind} ${request.id} cannot open in place` +
        (request.fallbackHref ? `; opening ${request.fallbackHref} in a new tab` : "; and it has no fallbackHref, so nothing opens"),
    );
    if (request.fallbackHref) window.open(request.fallbackHref, "_blank", "noopener,noreferrer");
    request.onClose?.();
  }
}

/**
 * Ask the app's one peek host to show a record. Returns a function that closes THIS peek.
 * With no host registered yet the request waits (see `RESOURCE_PEEK_HOST_WAIT_MS`): drawn as soon as
 * the host registers, or opened at `fallbackHref` in a new tab when none arrives — never nothing.
 */
export function openResourcePeek(request: ResourcePeekRequest): () => void {
  const key = keyOf(request);
  const next: OpenResourcePeek = { ...request, key };
  if (hostCount === 0 && typeof window !== "undefined") {
    const replaced = pending.find((e) => e.key === key);
    pending = [...pending.filter((e) => e.key !== key), next];
    if (replaced && replaced.onClose !== next.onClose) replaced.onClose?.();
    pendingTimer ??= setTimeout(giveUpWaiting, RESOURCE_PEEK_HOST_WAIT_MS);
    return () => closeResourcePeek(key);
  }
  show(next);
  return () => closeResourcePeek(key);
}

export interface CloseResourcePeekOptions {
  /** Call the request's `onClose` (default true). */
  notify?: boolean;
  /** Close only when the open request for this key still belongs to this owner (its `onClose`). */
  owner?: () => void;
}

/** Close one peek by key (idempotent), whether drawn or still waiting for the host. */
export function closeResourcePeek(key: string, options?: CloseResourcePeekOptions): void {
  const owned = (e: OpenResourcePeek) => e.key === key && (!options?.owner || e.onClose === options.owner);
  const waiting = pending.find(owned);
  if (waiting) {
    pending = pending.filter((e) => e !== waiting);
    if (options?.notify !== false) waiting.onClose?.();
  }
  const entry = entries.find(owned);
  if (!entry) return;
  entries = entries.filter((e) => e !== entry);
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
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  // Requests made before the host's effect ran (first commit, deep link) are drawn now.
  const waiting = pending;
  pending = [];
  for (const request of waiting) show(request);
  return () => {
    hostCount = Math.max(0, hostCount - 1);
  };
}
