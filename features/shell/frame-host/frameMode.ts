// WHO GETS THE NEW APP FRAME (ROLLOUT-PLAN §1; owner, 2026-10-21: "Yes, admins only").
//
// Pure decision + names, shared by the (core) layout's server read (frameMode.server.ts) and the
// request middleware that remembers the choice (utils/supabase/middleware.ts). The choice is made
// per HARD load: the layout never re-renders on in-app navigation, so turning the frame on or off
// is always a full page load (`?frame=new` / `?frame=classic`).

/** Who may opt in. A CODE constant, never an env var: widening is a release, not a toggle. */
export type FrameRollout = "off" | "admins" | "staff" | "everyone-optin" | "everyone";
export const FRAME_ROLLOUT: FrameRollout = "admins";

/** The remembered opt-in: "new" while on, absent otherwise. Set and cleared ONLY by the middleware. */
export const FRAME_COOKIE = "matrx_frame";
/** `?frame=new` turns it on for this person (and remembers it); `?frame=classic` turns it off. */
export const FRAME_PARAM = "frame";
export const FRAME_ON = "new";
export const FRAME_OFF = "classic";
/** A year: the opt-in lasts until the person says classic. */
export const FRAME_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

/** The global kill switch (platform.feature_knob `shell.new_frame_enabled`): off = nobody gets the frame. */
export const FRAME_KILL_SWITCH_KNOB = { feature: "shell", key: "new_frame_enabled" } as const;

export type FrameMode = "frame" | "classic";

/** `?frame=` from a query string: "new", "classic", or null when absent or anything else. */
export function frameParam(search: string | null | undefined): typeof FRAME_ON | typeof FRAME_OFF | null {
  if (!search) return null;
  const value = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(FRAME_PARAM);
  return value === FRAME_ON || value === FRAME_OFF ? value : null;
}

/** Whether the rollout admits this person at all (before their own choice). */
export function rolloutAdmits(rollout: FrameRollout, who: { isAuthenticated: boolean; isAdmin: boolean }): boolean {
  if (!who.isAuthenticated) return false;
  if (rollout === "off") return false;
  if (rollout === "admins" || rollout === "staff") return who.isAdmin;
  return true;
}

/**
 * Steps 1–4 of the decision (the kill switch is step 5, read by the server only when this says
 * "frame"): guests are always classic; the rollout gate; `?frame=` wins for this request; else
 * the remembered cookie. `everyone` defaults to the frame unless the person chose classic.
 */
export function pickFrameMode(input: {
  search: string | null | undefined;
  cookie: string | undefined;
  isAuthenticated: boolean;
  isAdmin: boolean;
  rollout?: FrameRollout;
}): FrameMode {
  const rollout = input.rollout ?? FRAME_ROLLOUT;
  if (!rolloutAdmits(rollout, input)) return "classic";
  const param = frameParam(input.search);
  if (param) return param === FRAME_ON ? "frame" : "classic";
  if (input.cookie === FRAME_ON) return "frame";
  if (rollout === "everyone") return input.cookie === FRAME_OFF ? "classic" : "frame";
  return "classic";
}

/** The cookie jar half the middleware needs (NextResponse.cookies fits it). */
export interface FrameCookieJar {
  set: (name: string, value: string, options: { path: string; maxAge: number; sameSite: "lax"; secure: boolean }) => unknown;
  delete: (name: string) => unknown;
}

/**
 * The middleware's write of the remembered choice for one request: `?frame=new` sets the cookie
 * (a year, whole site), `?frame=classic` clears it, anything else (absent, a typo) leaves it alone.
 */
export function rememberFrameChoice(url: { search: string; protocol: string }, jar: FrameCookieJar): void {
  const choice = frameParam(url.search);
  if (choice === FRAME_ON) {
    jar.set(FRAME_COOKIE, FRAME_ON, { path: "/", maxAge: FRAME_COOKIE_MAX_AGE_S, sameSite: "lax", secure: url.protocol === "https:" });
  } else if (choice === FRAME_OFF) {
    jar.delete(FRAME_COOKIE);
  }
}
