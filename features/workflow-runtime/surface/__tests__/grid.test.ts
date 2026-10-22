/**
 * THE RUN PAGE ON THE ONE GRID ENGINE (lane W). The run page used to flow on its own CSS span engine and the
 * builder on its own 24-column packer; both now go through design-system GridCanvas line mode. Two things must
 * stay true, proven here against EVERY run surface stored live on 2026-10-22 (workflow.runtime_surface, 5 rows):
 *
 * 1. Lossless: opening a stored surface moves no box — every stored {x, y, w, h} reads back byte for byte.
 * 2. Same page: the engine draws each screen in the order and with the column spans the old renderer used
 *    (array order; span = round(w / 24 * 12) clamped to 4..12; one column on a phone in mobile order).
 */
import { resolveGridCanvas } from "@ai-matrx/design-system";
import { normalize, panelsOfScreen } from "../../builder/layout-model";
import type { Readout, RunSurfaceConfig } from "../config";
import { lineSpan, runCanvasItems } from "../grid";

type Stored = { pages: string[] | null; r: { id: string; pageId: string | null; pos: Readout["pos"] }[] };

// The live rows (positions only — the rest of a readout is carried by spread and proven in layout-model.test.ts).
const LIVE: Stored[] = [
  { pages: ["brief", "making", "episode"], r: [
    { id: "rail-brief", pageId: "brief", pos: { x: 0, y: 0, w: 24, h: 5 } },
    { id: "brief", pageId: "brief", pos: { x: 0, y: 5, w: 24, h: 9 } },
    { id: "rail-making", pageId: "making", pos: { x: 0, y: 0, w: 24, h: 6 } },
    { id: "making-live", pageId: "making", pos: { x: 0, y: 6, w: 24, h: 12 } },
    { id: "final", pageId: "episode", pos: { x: 0, y: 0, w: 24, h: 16 } },
  ] },
  { pages: null, r: [
    { id: "auto:rail", pageId: null, pos: { x: 0, y: 0, w: 24, h: 8 } },
    { id: "auto:call_w1", pageId: null, pos: { x: 0, y: 8, w: 24, h: 8 } },
    { id: "auto:call_w2", pageId: null, pos: { x: 0, y: 16, w: 12, h: 8 } },
    { id: "auto:call_w3", pageId: null, pos: { x: 12, y: 16, w: 12, h: 8 } },
    { id: "auto:call_w4", pageId: null, pos: { x: 0, y: 24, w: 12, h: 8 } },
    { id: "auto:call_w5", pageId: null, pos: { x: 12, y: 24, w: 12, h: 8 } },
    { id: "auto:unpack_w5", pageId: null, pos: { x: 0, y: 32, w: 12, h: 8 } },
    { id: "auto:call_w6", pageId: null, pos: { x: 12, y: 32, w: 12, h: 8 } },
    { id: "auto:call_w7", pageId: null, pos: { x: 0, y: 40, w: 12, h: 8 } },
    { id: "auto:call_w8", pageId: null, pos: { x: 12, y: 40, w: 12, h: 8 } },
    { id: "auto:w0_out", pageId: null, pos: { x: 0, y: 48, w: 12, h: 8 } },
  ] },
  { pages: ["prep", "writing", "pack"], r: [
    { id: "rail-prep", pageId: "prep", pos: { x: 0, y: 0, w: 24, h: 6 } },
    { id: "materials", pageId: "prep", pos: { x: 0, y: 6, w: 12, h: 8 } },
    { id: "knowledge-map", pageId: "prep", pos: { x: 12, y: 6, w: 12, h: 8 } },
    { id: "rail-writing", pageId: "writing", pos: { x: 0, y: 0, w: 24, h: 6 } },
    { id: "notes", pageId: "writing", pos: { x: 0, y: 6, w: 12, h: 10 } },
    { id: "flashcards", pageId: "writing", pos: { x: 12, y: 6, w: 12, h: 10 } },
    { id: "quiz", pageId: "writing", pos: { x: 0, y: 16, w: 12, h: 10 } },
    { id: "lessons", pageId: "writing", pos: { x: 12, y: 16, w: 12, h: 10 } },
    { id: "images", pageId: "writing", pos: { x: 0, y: 26, w: 12, h: 6 } },
    { id: "final-flashcards", pageId: "pack", pos: { x: 0, y: 0, w: 12, h: 12 } },
    { id: "final-quiz", pageId: "pack", pos: { x: 12, y: 0, w: 12, h: 12 } },
  ] },
  { pages: null, r: [{ id: "auto:rail", pageId: null, pos: { x: 0, y: 0, w: 24, h: 8 } }] },
  { pages: null, r: [
    { id: "auto:rail", pageId: null, pos: { x: 0, y: 0, w: 24, h: 8 } },
    { id: "auto:n-showDraft01", pageId: null, pos: { x: 0, y: 8, w: 8, h: 8 } },
    { id: "auto:n-showRefined01", pageId: null, pos: { x: 8, y: 8, w: 16, h: 8 } },
    { id: "auto:n-showFinal01", pageId: null, pos: { x: 0, y: 16, w: 12, h: 8 } },
  ] },
];

const asConfig = (s: Stored): RunSurfaceConfig => ({
  schemaVersion: 1,
  pages: (s.pages ?? []).map((id) => ({ id, title: id })),
  readouts: s.r.map((r) => ({ id: r.id, ...(r.pageId ? { pageId: r.pageId } : {}), source: { kind: "progressRail" }, pos: r.pos })),
});
const posOf = (c: RunSurfaceConfig) => Object.fromEntries(c.readouts.map((r) => [r.id, r.pos]));

/** The old renderer's span (RunSurfaceView `flowSpan`, deleted in lane W). */
const oldFlowSpan = (w: number) => Math.min(12, Math.max(4, Math.round((w / 24) * 12)));

describe("the run page on GridCanvas line mode", () => {
  it.each(LIVE.map((s, n) => [n, s] as const))("live surface %i opens without moving a box", (_n, stored) => {
    const config = asConfig(stored);
    expect(posOf(normalize(config))).toEqual(posOf(config));
  });

  it.each(LIVE.map((s, n) => [n, s] as const))("live surface %i draws in the old order and spans", (_n, stored) => {
    const config = asConfig(stored);
    const screens = config.pages.length ? config.pages.map((p) => p.id) : [null];
    for (const screen of screens) {
      const panels = panelsOfScreen(config, screen);
      const { lg, sm } = resolveGridCanvas(runCanvasItems(panels), "content");
      // Reading order (line, then column) is the array order, each at the old span.
      const reading = [...lg].sort((a, b) => a.y - b.y || a.x - b.x).map((b) => b.id);
      expect(reading).toEqual(panels.map((p) => p.id));
      expect(lg.map((b) => b.w)).toEqual(panels.map((p) => oldFlowSpan(p.pos.w)));
      // A phone: one column, one per line.
      expect(sm.every((b) => b.x === 0 && b.w === 4)).toBe(true);
      expect(new Set(sm.map((b) => b.y)).size).toBe(panels.length);
    }
  });

  it("a stage too narrow for columns spans every readout; a phone follows mobile order", () => {
    const panels = asConfig(LIVE[2]!).readouts.filter((r) => r.pageId === "writing");
    const items = runCanvasItems(panels, { fullWidth: true, phoneOrder: ["images", ...panels.map((p) => p.id).filter((id) => id !== "images")] });
    const { lg, sm } = resolveGridCanvas(items, "content");
    expect(lg.every((b) => b.w === 12 && b.x === 0)).toBe(true);
    expect(sm.find((b) => b.id === "images")?.y).toBe(0);
  });

  it("maps every builder width to its line span exactly", () => {
    expect([8, 12, 16, 24].map(lineSpan)).toEqual([4, 6, 8, 12]);
    expect([1, 5, 23].map(lineSpan)).toEqual([1, 5, 23].map(oldFlowSpan));
  });
});
