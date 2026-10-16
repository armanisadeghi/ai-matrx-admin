/**
 * loadTraceFlag.ts — the switches that turn the load trace on, with NO imports (any module may
 * write them without adding a build-graph edge).
 *
 *   ?trace=load  → on in this browser for everyone (remembered)      FORCE_KEY = "1"
 *   ?trace=off   → silenced in this browser, even on localhost        FORCE_KEY = "0"
 *   admin debug mode on → ADMIN_KEY = "1", written by the debug switch (features/admin), read at the
 *                 NEXT page boot (the trace installs before Redux exists, so it cannot ask the store)
 *   localhost / *.localhost / 127.0.0.1 / a development build → on by default
 */

export const LOAD_TRACE_FORCE_KEY = "matrx:load-trace";
export const LOAD_TRACE_ADMIN_KEY = "matrx:load-trace-admin";

/** One cheap check. Applies a `?trace=` parameter first, so it sticks for later loads. */
export function loadTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const store = window.localStorage;
    const param = new URLSearchParams(window.location.search).get("trace");
    if (param === "load") store.setItem(LOAD_TRACE_FORCE_KEY, "1");
    if (param === "off") store.setItem(LOAD_TRACE_FORCE_KEY, "0");
    const forced = store.getItem(LOAD_TRACE_FORCE_KEY);
    if (forced === "0") return false;
    if (forced === "1") return true;
    if (store.getItem(LOAD_TRACE_ADMIN_KEY) === "1") return true;
    const host = window.location.hostname;
    return (
      process.env.NODE_ENV === "development" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

/** Written by the admin debug switch; takes effect on the next page load. */
export function setAdminLoadTrace(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(LOAD_TRACE_ADMIN_KEY, "1");
    else window.localStorage.removeItem(LOAD_TRACE_ADMIN_KEY);
  } catch {
    /* storage blocked */
  }
}
