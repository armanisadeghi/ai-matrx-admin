"use client";
// lib/guest/turnstile.ts — the invisible human check sent when a NEW guest is made (FREE-ALLOWANCE.md §5).
//
// aidream verifies the token only when it is about to mint a new guest identity (knob
// auth.guest_identity/turnstile_at_mint), so a returning guest is never asked. Cloudflare's script loads
// on first use only — never on a page view. No site key configured, or the script cannot load: the answer
// is null and the request goes without one (the server decides: off/shadow mint anyway, enforce refuses).

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const WAIT_MS = 15_000;

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

/** One fresh Turnstile token (single use), or null when there is no site key or the check could not run. */
export async function getTurnstileToken(): Promise<string | null> {
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
    }, WAIT_MS);
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
    const token = await getTurnstileToken();
    if (!token) return base(input, init);
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return base(input, init);
    }
    return base(input, { ...init, body: JSON.stringify({ ...body, turnstile_token: token }) });
  };
}
