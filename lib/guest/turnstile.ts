// lib/guest/turnstile.ts — the invisible human check sent when a NEW guest is made (FREE-ALLOWANCE.md §5).
//
// aidream verifies a token only when it is about to mint a new guest identity (knob
// auth.guest_identity/turnstile_at_mint). So the browser asks the server first (GET /auth/guest/challenge:
// the mode as THIS server applies it, and whether this visitor id already owns a guest) and runs the check
// ONLY for a mint, ONLY when the mode is shadow or enforce. The mint is ONE single-flight request
// (POST /auth/guest/challenge carrying the token); every other request — concurrent or later — waits for it
// and then rides the minted guest with no token at all, so a single-use token is never shared or reused.
// A failed or timed-out check is remembered briefly: no request waits on it again. Timings are server knobs.
import { BACKEND_URLS } from "@/lib/api/endpoints";
import { getFingerprint } from "@/lib/services/fingerprint-service";

// Console noise that is Cloudflare's, not ours (live walk 2026-10-22, reproduced signed out on /search and /chat):
// the invisible widget's own iframe (challenges.cloudflare.com/.../turnstile/.../invisible) probes its sandbox with
// `fetch("data:,")` and logs "Connecting to 'data:,' violates ... connect-src" against ITS OWN policy, and its
// private-access-token probe (`/cdn-cgi/challenge-platform/h/b/pat/...`) answers 401 by design when the browser
// holds no token. Neither comes from our page (its CSP is frame-ancestors only), neither blocks the check. Leave both.
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  execute(widget: string): void;
  reset(widget: string): void;
  remove(widget: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi | null> | null = null;

export function turnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

function loadScript(): Promise<TurnstileApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi | null>((resolve) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve(window.turnstile ?? null);
    el.onerror = () => {
      console.warn("[turnstile] the human-check script could not load; the guest is made without a token");
      scriptPromise = null;
      resolve(null);
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/** One fresh Turnstile token (single use), or null when there is no site key or the check could not run
 *  within `waitMs` (the server's `challenge_token_wait_ms`). */
export async function getTurnstileToken(waitMs: number = FALLBACK_WAIT_MS): Promise<string | null> {
  const sitekey = turnstileSiteKey();
  if (!sitekey) return null;
  const api = await loadScript();
  if (!api) return null;
  const host = document.createElement("div");
  host.style.display = "none";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  return new Promise<string | null>((resolve) => {
    let widget: string | null = null;
    const done = (token: string | null) => {
      clearTimeout(timer);
      try {
        if (widget) api.remove(widget);
      } catch {
        // already gone
      }
      host.remove();
      resolve(token);
    };
    const timer = setTimeout(() => {
      console.warn("[turnstile] the human check did not answer in time; the guest is made without a token");
      done(null);
    }, waitMs);
    try {
      widget = api.render(host, {
        sitekey,
        size: "invisible",
        execution: "render",
        appearance: "interaction-only",
        callback: (token: string) => done(token),
        "error-callback": () => done(null),
        "expired-callback": () => done(null),
      });
    } catch (err) {
      console.warn("[turnstile] the human check could not start", err);
      done(null);
    }
  });
}

/**
 * A `fetch` for the guest-session door: adds a fresh Turnstile token to the JSON body of
 * `POST /auth/guest/session` (field `turnstile_token`, which aidream reads at the mint).
 */
export function fetchWithGuestChallenge(base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.endsWith("/auth/guest/session") || init?.method !== "POST" || typeof init.body !== "string") {
      return base(input, init);
    }
    // The session door always mints; ask for a token only when the server would read it.
    if (Date.now() < failedUntil || Date.now() < modeOffUntil) return base(input, init);
    const fresh = lastPolicy && Date.now() - lastPolicyAt < lastPolicy.recheck_seconds * 1000;
    const policy = fresh ? lastPolicy : await readPolicy(BACKEND_URLS.production ?? "", null);
    if (!policy || policy.mode === "off") return base(input, init);
    const token = await getTurnstileToken(policy.token_wait_ms);
    if (!token) {
      fail(policy);
      return base(input, init);
    }
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return base(input, init);
    }
    return base(input, { ...init, body: JSON.stringify({ ...body, turnstile_token: token }) });
  };
}

// ── the server's policy and the ONE mint ────────────────────────────────────────────────────────────

/** Used only when the server's policy could not be read (its knobs carry the real values). */
const FALLBACK_WAIT_MS = 5_000;
const FALLBACK_FAILURE_MS = 60_000;
const POLICY_TIMEOUT_MS = 3_000;
const READY_KEY = "matrx.guest-identity-ready";

interface ChallengePolicy {
  mode: "off" | "shadow" | "enforce";
  has_identity: boolean;
  recheck_seconds: number;
  token_wait_ms: number;
  failure_cache_seconds: number;
}

let readyFingerprint: string | null = null;
let modeOffUntil = 0;
let failedUntil = 0;
let minting: Promise<boolean> | null = null;
let lastPolicy: ChallengePolicy | null = null;
let lastPolicyAt = 0;

function readStoredReady(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(READY_KEY);
  } catch {
    return null;
  }
}

function markReady(fingerprint: string): void {
  readyFingerprint = fingerprint;
  try {
    window.localStorage.setItem(READY_KEY, fingerprint);
  } catch {
    // storage blocked: memory still holds it for this tab
  }
}

function fail(policy: ChallengePolicy | null): false {
  failedUntil = Date.now() + (policy ? policy.failure_cache_seconds * 1000 : FALLBACK_FAILURE_MS);
  return false;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, credentials: "omit" });
  } finally {
    clearTimeout(timer);
  }
}

async function readPolicy(baseUrl: string, fingerprint: string | null): Promise<ChallengePolicy | null> {
  try {
    const res = await fetchJson(
      `${baseUrl}/auth/guest/challenge`,
      { method: "GET", headers: fingerprint ? { "X-Fingerprint-ID": fingerprint } : {} },
      POLICY_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as ChallengePolicy;
    lastPolicy = body;
    lastPolicyAt = Date.now();
    if (body.mode === "off") modeOffUntil = Date.now() + body.recheck_seconds * 1000;
    return body;
  } catch {
    return null;
  }
}

async function mintOnce(baseUrl: string, fingerprint: string): Promise<boolean> {
  const policy = await readPolicy(baseUrl, fingerprint);
  if (!policy) return fail(null);
  if (policy.has_identity) {
    markReady(fingerprint);
    return true;
  }
  if (policy.mode === "off") return true; // the request mints itself; nothing to check
  const token = await getTurnstileToken(policy.token_wait_ms);
  if (!token) return fail(policy);
  try {
    const res = await fetchJson(
      `${baseUrl}/auth/guest/challenge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Fingerprint-ID": fingerprint, [TURNSTILE_HEADER]: token },
        body: "{}",
      },
      policy.token_wait_ms + POLICY_TIMEOUT_MS,
    );
    if (!res.ok) return fail(policy);
    markReady(fingerprint);
    return true;
  } catch {
    return fail(policy);
  }
}

/**
 * Before a signed-out request that may mint a visitor: make sure the visitor exists, minting it ONCE
 * (single flight across every caller in the tab). Resolves `true` when the visitor exists or the server
 * asks for no check (the request may go), `false` when the check failed or could not run — remembered
 * for the server's `challenge_failure_cache_seconds`, so no later request waits. `fresh`: the server
 * just refused this visitor (403 guest_challenge_failed), so forget that it exists.
 */
export async function ensureGuestIdentity(options: { fresh?: boolean; baseUrl?: string } = {}): Promise<boolean> {
  if (typeof window === "undefined" || !turnstileSiteKey()) return true;
  if (options.fresh) {
    readyFingerprint = null;
    modeOffUntil = 0;
    try {
      window.localStorage.removeItem(READY_KEY);
    } catch {
      // storage blocked
    }
  }
  if (Date.now() < failedUntil) return false;
  if (Date.now() < modeOffUntil) return true;
  let fingerprint: string;
  try {
    fingerprint = await getFingerprint();
  } catch {
    return true;
  }
  readyFingerprint ??= readStoredReady();
  if (fingerprint && readyFingerprint === fingerprint) return true;
  const baseUrl = (options.baseUrl ?? BACKEND_URLS.production ?? "").replace(/\/+$/, "");
  minting ??= mintOnce(baseUrl, fingerprint).finally(() => {
    minting = null;
  });
  return minting;
}

/** The chat package's token source (`registerChatGuestChallenge`, providers/chatGuestChallengeRegistration.ts):
 *  the visitor is minted first by `ensureGuestIdentity`, so a chat request never carries a token itself. */
export async function guestChallengeToken(options: { fresh?: boolean } = {}): Promise<string | null> {
  await ensureGuestIdentity(options);
  return null;
}

/** Tests only: forget every remembered answer. */
export function resetGuestChallengeForTests(): void {
  readyFingerprint = null;
  modeOffUntil = 0;
  failedUntil = 0;
  minting = null;
  lastPolicy = null;
  scriptPromise = null;
}

/** The server's refusal of a new visitor whose request carried no passing human check. */
export const GUEST_CHALLENGE_REFUSAL = "guest_challenge_failed";

/** True when a refusal body (any envelope: top level or `detail`, `error` or `code`) is that refusal. */
export function isGuestChallengeRefusalBody(body: unknown): boolean {
  const rec = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  const top = rec(body);
  if (!top) return false;
  const inner = rec(top.detail);
  return [top.error, top.code, inner?.error, inner?.code].includes(GUEST_CHALLENGE_REFUSAL);
}

/** The header the fingerprint lane carries (aidream services/auth_guest/mint_challenge.py HEADER). */
export const TURNSTILE_HEADER = "X-Turnstile-Token";
