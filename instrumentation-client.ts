/**
 * Client instrumentation — runs before the application's own code hydrates.
 *
 * This is the earliest client hook Next.js provides, which is exactly what the
 * capture taps need: a request made during boot must be recorded like any
 * other. Installing from a component would miss anything that fetches before
 * that component mounts.
 *
 * Two taps, two substrates — `fetch` covers every HTTP call, `WebSocket` covers
 * the realtime transports that never touch fetch. Both are required for
 * coverage to be complete.
 *
 * They start in `minimal` mode (a 3-exchange rolling window that cannot
 * accumulate). Full retention is opt-in and admin-gated — see `capture-mode.ts`.
 */

import { installCaptureTap } from "@/lib/diagnostics/stream-capture/install-fetch-tap";
import { installWebSocketTap } from "@/lib/diagnostics/stream-capture/install-websocket-tap";
import { applyPersistedCaptureMode } from "@/lib/diagnostics/stream-capture/capture-mode";
import { installLoadTrace } from "@/lib/diagnostics/loadTrace";

// The ordered page-load timeline (`?trace=load`); a no-op unless switched on in this browser.
installLoadTrace();

installCaptureTap();
installWebSocketTap();

// Retention is restored here, NOT when the inspector mounts — otherwise a
// session recorded before opening the panel would already have been evicted.
applyPersistedCaptureMode();
