/**
 * The overlay sweep's on-screen proof. A store flag is NOT proof: an overlay whose render returns
 * null, sits behind its loading fallback, or lands off-screen still reads "open" in the store
 * (adversarial review 2026-10-18, item 2). "Rendered" needs a box on screen from one of:
 *
 *   window-ack    summon's render watchdog holds a window ack for the id (WindowPanel mounted), and
 *                 that `[data-window-id]` element has a visible box
 *   overlay-node  a descendant of the app's `[data-overlay-id="<id>"]` wrapper (AppSummonProvider's
 *                 renderWrapper) has a visible box — the package loading fallback does not count
 *   new-surface   a dialog / window surface that was not on the page before the open is visible
 *                 (portaled dialogs and sheets render outside the wrapper)
 *
 * The probe is a plain JS SOURCE string: Playwright serializes only a callback's own text, and the
 * TS loader's injected helpers (`__name`) do not exist in the page. Jest runs the same source.
 */

export interface ProbeArgs {
  overlayId: string;
  /** `data-probe-seen` stamp of surfaces present before the open (see SNAPSHOT_SOURCE). */
  before: string;
}

export interface ProbeResult {
  proof: "window-ack" | "overlay-node" | "new-surface" | null;
  /** The package loading fallback is still showing for this overlay. */
  loading: boolean;
  /** What the proof measured (a selector and a box), for the report. */
  detail: string | null;
}

/** Stamps every surface on the page now, so the probe can tell new ones apart. Returns the stamp. */
export const SNAPSHOT_SOURCE = String.raw`(function snapshot() {
  var stamp = "s" + Date.now() + Math.random().toString(36).slice(2, 6);
  document.querySelectorAll('[role="dialog"],[role="alertdialog"],[data-window-id]').forEach(function (el) {
    el.setAttribute("data-probe-seen", stamp);
  });
  return stamp;
})`;

export const PROBE_SOURCE = String.raw`(function probe(args) {
  var vw = window.innerWidth, vh = window.innerHeight;
  function visible(el) {
    var r = el.getBoundingClientRect();
    if (!(r.width >= 2 && r.height >= 2)) return null;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return null;
    var cs = window.getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || (cs.opacity !== "" && Number(cs.opacity) === 0)) return null;
    if (el.closest("[hidden]")) return null;
    return Math.round(r.width) + "x" + Math.round(r.height) + "@" + Math.round(r.left) + "," + Math.round(r.top);
  }
  // summon's default loading fallback: a fixed full-screen layer whose child is role=status
  function isLoadingFallback(el) {
    var status = el.querySelector(':scope > [role="status"]');
    return !!status && !!status.querySelector(".animate-spin");
  }
  var slot = globalThis[Symbol.for("ai-matrx.summon.renderWatchdog")];
  var ack = slot && slot.renderAcks && slot.renderAcks.get(args.overlayId);
  if (ack && ack.kind === "window") {
    var win = document.querySelector('[data-window-id="' + CSS.escape(ack.windowId) + '"]');
    var box = win && visible(win);
    if (box) return { proof: "window-ack", loading: false, detail: "[data-window-id=" + ack.windowId + "] " + box };
  }
  var loading = false;
  var wrappers = document.querySelectorAll('[data-overlay-id="' + CSS.escape(args.overlayId) + '"]');
  for (var i = 0; i < wrappers.length; i++) {
    var all = wrappers[i].querySelectorAll("*");
    var skip = null;
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      if (skip && skip.contains(el)) continue;
      if (isLoadingFallback(el)) { loading = true; skip = el; continue; }
      var b = visible(el);
      if (b) return { proof: "overlay-node", loading: false, detail: "[data-overlay-id=" + args.overlayId + "] > " + el.tagName.toLowerCase() + " " + b };
    }
  }
  var surfaces = document.querySelectorAll('[role="dialog"],[role="alertdialog"],[data-window-id]');
  for (var k = 0; k < surfaces.length; k++) {
    var s = surfaces[k];
    if (s.getAttribute("data-probe-seen") === args.before) continue;
    var sb = visible(s);
    if (sb) return { proof: "new-surface", loading: false, detail: (s.getAttribute("role") || "window") + " " + sb };
  }
  return { proof: null, loading: loading, detail: null };
})`;

export type SweepStatus = "rendered" | "blank" | "loading" | "error-card" | "console-error" | "not-open";

export interface SweepEvidence {
  open: boolean;
  errorCard: string | null;
  consoleErrors: readonly string[];
  probe: ProbeResult;
}

/** One verdict per id. Only "rendered" is clean; "blank" = open in the store, nothing on screen. */
export function classifyOverlay(e: SweepEvidence): SweepStatus {
  if (e.errorCard) return "error-card";
  if (!e.probe.proof) {
    if (e.probe.loading) return "loading";
    return e.open ? "blank" : "not-open";
  }
  return e.consoleErrors.length ? "console-error" : "rendered";
}

/** Run the page sources here (jsdom tests). */
export function runSnapshotHere(): string {
  return (0, eval)(SNAPSHOT_SOURCE)() as string;
}
export function runProbeHere(args: ProbeArgs): ProbeResult {
  return (0, eval)(PROBE_SOURCE)(args) as ProbeResult;
}
