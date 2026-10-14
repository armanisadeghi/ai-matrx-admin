/**
 * Carries the live instance a viewer saw render badly from "Change for
 * everyone" into the admin kind builder's Data structure box — never in the
 * URL (payload data stays out of query strings): the link carries a one-time
 * nonce, the data waits under that nonce in localStorage (a new tab does not
 * inherit sessionStorage) and is read once, then removed. A short lease keeps
 * an unclaimed entry from lingering.
 */
const PREFIX = "matrx.kind-builder-handoff.";
const LEASE_MS = 10 * 60 * 1000;
const MAX_CHARS = 200_000;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function newNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Text the builder box takes for an instance (pretty JSON, a string as is). */
export function instanceToBuilderText(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

/** Park the instance under a fresh nonce; null when there is nothing to carry or no storage. */
export function stashBuilderInstance(value: unknown, now: number = Date.now()): string | null {
  const text = instanceToBuilderText(value);
  const store = storage();
  if (!text || text.length > MAX_CHARS || !store) return null;
  const nonce = newNonce();
  try {
    store.setItem(PREFIX + nonce, JSON.stringify({ at: now, text }));
  } catch {
    return null;
  }
  return nonce;
}

/** Read-once: returns the parked text and removes it; null when absent or past its lease. */
export function takeBuilderInstance(nonce: string | null | undefined, now: number = Date.now()): string | null {
  const store = storage();
  if (!nonce || !store) return null;
  const key = PREFIX + nonce;
  const raw = store.getItem(key);
  store.removeItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { at?: unknown; text?: unknown };
    if (typeof parsed.text !== "string" || typeof parsed.at !== "number") return null;
    return now - parsed.at <= LEASE_MS ? parsed.text : null;
  } catch {
    return null;
  }
}

/** The href with the nonce added (`handoff=`); the slug part is untouched. */
export function withBuilderHandoff(href: string, nonce: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}handoff=${encodeURIComponent(nonce)}`;
}
