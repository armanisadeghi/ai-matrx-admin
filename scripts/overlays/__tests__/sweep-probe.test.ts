/**
 * @jest-environment jsdom
 *
 * The overlay sweep must not call a blank overlay "rendered" (adversarial review 2026-10-18,
 * item 2). Plants overlays in the DOM the way the app's host renders them and runs the sweep's
 * real page probe over them.
 */
import { classifyOverlay, runProbeHere, runSnapshotHere, type ProbeResult } from "../sweep-probe";

const ACK = Symbol.for("ai-matrx.summon.renderWatchdog");

function box(el: Element, w: number, h: number, x = 100, y = 100) {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({ width: w, height: h, left: x, top: y, right: x + w, bottom: y + h, x, y, toJSON: () => ({}) }) as DOMRect;
}

function verdict(probe: ProbeResult, open = true) {
  return classifyOverlay({ open, errorCard: null, consoleErrors: [], probe });
}

beforeAll(() => {
  // jsdom has no CSS.escape
  (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS ??= { escape: (s: string) => s.replace(/["\\]/g, "\\$&") };
});

beforeEach(() => {
  document.body.innerHTML = "";
  (globalThis as Record<symbol, unknown>)[ACK] = { renderAcks: new Map() };
});

describe("overlay sweep on-screen proof", () => {
  it("RED: an overlay whose render returns null is blank, not rendered", () => {
    const before = runSnapshotHere();
    // the host mounted the wrapper; the overlay's component returned null
    document.body.innerHTML = `<div data-overlay-id="nullOverlay" style="display:contents"></div>`;
    const probe = runProbeHere({ overlayId: "nullOverlay", before });
    expect(probe.proof).toBeNull();
    expect(verdict(probe)).toBe("blank");
  });

  it("RED: a zero-size or off-screen node is no proof", () => {
    const before = runSnapshotHere();
    document.body.innerHTML = `<div data-overlay-id="tiny"><div id="a"></div><div id="b"></div></div>`;
    box(document.getElementById("a")!, 0, 0);
    box(document.getElementById("b")!, 300, 200, -5000, 100);
    expect(verdict(runProbeHere({ overlayId: "tiny", before }))).toBe("blank");
  });

  it("RED: only the package loading fallback on screen is loading, not rendered", () => {
    const before = runSnapshotHere();
    document.body.innerHTML = `<div data-overlay-id="slow"><div id="fb" class="fixed inset-0"><div role="status"><span class="animate-spin"></span>Loading</div></div></div>`;
    box(document.getElementById("fb")!, 1600, 1000, 0, 0);
    box(document.querySelector('[role="status"]')!, 200, 50);
    expect(verdict(runProbeHere({ overlayId: "slow", before }))).toBe("loading");
  });

  it("RED: a window ack whose panel has no box is no proof", () => {
    const before = runSnapshotHere();
    (globalThis as unknown as Record<symbol, { renderAcks: Map<string, unknown> }>)[ACK]!.renderAcks.set("w", { kind: "window", windowId: "w-1" });
    document.body.innerHTML = `<div data-window-id="w-1"></div>`;
    box(document.querySelector("[data-window-id]")!, 0, 0);
    expect(verdict(runProbeHere({ overlayId: "w", before }))).toBe("blank");
  });

  it("GREEN: a visible node inside the overlay wrapper", () => {
    const before = runSnapshotHere();
    document.body.innerHTML = `<div data-overlay-id="card"><section id="c"></section></div>`;
    box(document.getElementById("c")!, 320, 180);
    const probe = runProbeHere({ overlayId: "card", before });
    expect(probe.proof).toBe("overlay-node");
    expect(verdict(probe)).toBe("rendered");
  });

  it("GREEN: a window ack with a visible panel", () => {
    const before = runSnapshotHere();
    (globalThis as unknown as Record<symbol, { renderAcks: Map<string, unknown> }>)[ACK]!.renderAcks.set("notesWindow", { kind: "window", windowId: "notes-1" });
    document.body.innerHTML = `<div data-window-id="notes-1"></div>`;
    box(document.querySelector("[data-window-id]")!, 800, 600);
    expect(runProbeHere({ overlayId: "notesWindow", before }).proof).toBe("window-ack");
  });

  it("GREEN only for NEW portaled dialogs: one already on the page before the open is not proof", () => {
    document.body.innerHTML = `<div role="dialog" id="old"></div>`;
    box(document.getElementById("old")!, 400, 300);
    const before = runSnapshotHere();
    expect(runProbeHere({ overlayId: "confirm", before }).proof).toBeNull();
    const fresh = document.createElement("div");
    fresh.setAttribute("role", "dialog");
    document.body.appendChild(fresh);
    box(fresh, 400, 300);
    expect(runProbeHere({ overlayId: "confirm", before }).proof).toBe("new-surface");
  });

  it("error cards and closed overlays keep their verdicts", () => {
    const none: ProbeResult = { proof: null, loading: false, detail: null };
    expect(classifyOverlay({ open: true, errorCard: "Try again", consoleErrors: [], probe: none })).toBe("error-card");
    expect(verdict(none, false)).toBe("not-open");
    expect(classifyOverlay({ open: true, errorCard: null, consoleErrors: ["x"], probe: { proof: "overlay-node", loading: false, detail: "" } })).toBe("console-error");
  });
});
