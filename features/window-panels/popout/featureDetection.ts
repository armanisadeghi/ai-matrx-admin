/**
 * Feature detection for the window-panels pop-out system.
 *
 * Three capability tiers, in order of preference:
 *
 * 1. **`"pip"`** — Document Picture-in-Picture API (Chromium-based browsers,
 *    Chrome 116+, Edge 116+, Opera). Frameless, always-on-top floating window.
 *    Detected by presence of `window.documentPictureInPicture.requestWindow`.
 *
 * 2. **`"popup"`** — `window.open()` fallback (Safari, Firefox, anything else).
 *    Universal browser support. Shows browser chrome (URL bar, tabs).
 *    Acceptable degradation: user still gets a separate window for multi-
 *    monitor workflows.
 *
 * 3. **`"none"`** — Embedded WebViews or other contexts where neither API is
 *    available (rare). The "Pop out" affordance should be hidden entirely.
 *
 * The detection is intentionally simple and synchronous — it runs once on
 * the client at component mount time and the result is stable for the
 * lifetime of the page.
 *
 * SSR safety: every code path branches on `typeof window` first.
 */

export type PopoutCapability = "pip" | "popup" | "none";

/**
 * Type augmentation for the Document Picture-in-Picture API.
 * The official spec lives at https://wicg.github.io/document-picture-in-picture/.
 *
 * We declare it locally rather than relying on `lib.dom.d.ts` because
 * TypeScript's built-in DOM types are inconsistent across `@types/node`
 * versions and the API is still in WICG (not yet WHATWG) status.
 */
export interface DocumentPictureInPictureRequestOptions {
  width?: number;
  height?: number;
  /**
   * If `true`, suppresses the "back to tab" button in the PiP window's
   * chrome. Default `false` — we want the user to be able to dock back.
   */
  disallowReturnToOpener?: boolean;
}

export interface DocumentPictureInPicture {
  requestWindow(
    options?: DocumentPictureInPictureRequestOptions,
  ): Promise<Window>;
  /** The currently open PiP window, or `null` if none. */
  readonly window: Window | null;
}

/**
 * Window-augmenting interface so callers can do
 * `(window as WindowWithPictureInPicture).documentPictureInPicture`
 * without TypeScript errors.
 */
export interface WindowWithDocumentPictureInPicture extends Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}

/**
 * Returns the highest-fidelity popout mechanism available in the current
 * browser. Safe to call during SSR (returns `"none"`).
 */
export function detectPopoutCapability(): PopoutCapability {
  if (typeof window === "undefined") return "none";

  const w = window as WindowWithDocumentPictureInPicture;
  if (
    w.documentPictureInPicture &&
    typeof w.documentPictureInPicture.requestWindow === "function"
  ) {
    return "pip";
  }

  // `window.open` is technically always defined, but in some sandboxed
  // contexts (extensions, embedded iframes with restrictive sandbox) it
  // returns `null` for any call. We can't pre-detect that without actually
  // calling it — and calling it without a user gesture would either fail or
  // open an unwanted popup. So we optimistically advertise "popup" support
  // and let the caller handle the runtime null result.
  if (typeof window.open === "function") {
    return "popup";
  }

  return "none";
}

/**
 * True when the browser supports Document Picture-in-Picture (the preferred
 * popout mode). Convenience wrapper around `detectPopoutCapability()` for
 * use in conditional rendering and feature flags.
 */
export function supportsDocumentPictureInPicture(): boolean {
  return detectPopoutCapability() === "pip";
}

/**
 * True when popout is available in any form (DPiP or popup).
 * Use this to decide whether to show the "Pop out" affordance at all.
 */
export function supportsAnyPopout(): boolean {
  return detectPopoutCapability() !== "none";
}
