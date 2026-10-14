// lib/api/ai-test-mode.ts — AI TEST MODE on the Python server.
//
// Rules: common-docs/policies/ai-test-mode.md. A test session may ask the
// server to answer AI steps from saved results instead of paying for a real
// call: `real` (default, always a real call), `replay` (same inputs → the
// saved answer) or `stand_in` (any saved answer for that job).
//
// The choice is per TAB (sessionStorage `matrx.aiTestMode`). A URL param
// `?ai_test_mode=replay|stand_in|real` on any page sets it — the door coding
// agents use. Every aidream transport adds `X-Matrx-AI-Test-Mode` beside the
// admin-lane header (`lib/api/organization-context.ts`, `adminLaneHeadersFor`
// callers, `python-client` buildHeaders) — only when the mode is NOT `real`,
// so a normal tab's requests never change. The header is a request, never a
// grant: the server gates who and when (`GET /ai-test-mode/status`).

export const AI_TEST_MODE_HEADER = "X-Matrx-AI-Test-Mode";
export const AI_TEST_MODE_STORAGE_KEY = "matrx.aiTestMode";
export const AI_TEST_MODE_URL_PARAM = "ai_test_mode";
export const AI_TEST_MODE_CHANGE_EVENT = "matrx:ai-test-mode-change";

export const AI_TEST_MODES = ["real", "replay", "stand_in"] as const;
export type AiTestMode = (typeof AI_TEST_MODES)[number];

export function isAiTestMode(value: unknown): value is AiTestMode {
  return typeof value === "string" && (AI_TEST_MODES as readonly string[]).includes(value);
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The mode a URL asks for, when it carries a valid `?ai_test_mode=`. */
export function aiTestModeFromSearch(search: string): AiTestMode | null {
  try {
    const value = new URLSearchParams(search).get(AI_TEST_MODE_URL_PARAM);
    return isAiTestMode(value) ? value : null;
  } catch {
    return null;
  }
}

function urlMode(): AiTestMode | null {
  if (typeof window === "undefined") return null;
  return aiTestModeFromSearch(window.location.search);
}

/** Store the tab's mode and tell every listener (the dock). */
export function setAiTestMode(mode: AiTestMode): void {
  const store = storage();
  try {
    if (mode === "real") store?.removeItem(AI_TEST_MODE_STORAGE_KEY);
    else store?.setItem(AI_TEST_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage refused (private mode / quota): the mode stays real for this tab.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AI_TEST_MODE_CHANGE_EVENT, { detail: mode }));
  }
}

/**
 * The tab's chosen mode. A `?ai_test_mode=` still on the URL wins and is saved
 * on this first read, so requests fired before the dock mounts already carry it.
 */
export function readAiTestMode(): AiTestMode {
  const fromUrl = urlMode();
  const store = storage();
  if (fromUrl) {
    try {
      if (fromUrl === "real") store?.removeItem(AI_TEST_MODE_STORAGE_KEY);
      else store?.setItem(AI_TEST_MODE_STORAGE_KEY, fromUrl);
    } catch {
      // Storage refused: the URL still decides this read.
    }
    return fromUrl;
  }
  try {
    const stored = store?.getItem(AI_TEST_MODE_STORAGE_KEY);
    return isAiTestMode(stored) ? stored : "real";
  } catch {
    return "real";
  }
}

/**
 * Saves a `?ai_test_mode=` param and strips it from the address bar without a
 * reload. Returns the mode it applied, or null when the URL carried none.
 */
export function captureAiTestModeFromUrl(): AiTestMode | null {
  const mode = urlMode();
  if (!mode || typeof window === "undefined") return null;
  setAiTestMode(mode);
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(AI_TEST_MODE_URL_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    // History refused: the param stays visible; the stored mode is unchanged.
  }
  return mode;
}

/** The header for one mode — empty for `real`, so default requests are untouched. */
export function aiTestModeHeadersFor(mode: AiTestMode): Record<string, string> {
  return mode === "real" ? {} : { [AI_TEST_MODE_HEADER]: mode };
}

/** The header this tab's requests carry right now (empty when real). */
export function aiTestModeHeaders(): Record<string, string> {
  return aiTestModeHeadersFor(readAiTestMode());
}

/** Adds the test-mode header when the tab is not on `real`. Returns the same shape. */
export function withAiTestModeHeader<H extends Record<string, string>>(headers: H): H {
  const extra = aiTestModeHeaders();
  return Object.keys(extra).length === 0 ? headers : { ...headers, ...extra };
}

/** Subscribe to mode changes in this tab (for `useSyncExternalStore`). */
export function subscribeAiTestMode(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AI_TEST_MODE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(AI_TEST_MODE_CHANGE_EVENT, onChange);
}
