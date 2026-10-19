/**
 * @jest-environment jsdom
 *
 * Auto-height measures only READY content (2026-10-18).
 *
 * SUT: `engine/content-ready.ts` `tileContentReady`, and `components/BoardTile.tsx`'s two measuring paths
 * (auto-height and grow-to-fit), which must both gate their write on it.
 *
 * Break it catches (board 0f6afaa4, live): a viewer at the full column measured every section while its
 * rows were still loading (or its lazy body had rendered nothing) and saved it — every section 154px, the
 * overview write-up 100px, for everyone.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { tileContentReady } from "../engine/content-ready";

const VISIBLE = { visibilityState: "visible" as DocumentVisibilityState };

/** A card as BoardTile draws it, laid out `h` px tall, with `body` inside `[data-board-body]`. */
function card(body: string, h = 400): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<header>Colors</header><div><div data-board-body>${body}</div></div>`;
  document.body.appendChild(el);
  Object.defineProperty(el, "offsetHeight", { value: h, configurable: true });
  el.getClientRects = () => (h > 0 ? ([{}] as unknown as DOMRectList) : ([] as unknown as DOMRectList));
  return el;
}

const ROWS = `<section data-records-section-card><h2>Colors</h2><div role="table"><div role="row">primary</div></div></section>`;

describe("tileContentReady", () => {
  afterEach(() => (document.body.innerHTML = ""));

  it("a section with its rows is ready", () => {
    expect(tileContentReady(card(ROWS), VISIBLE)).toBe(true);
  });

  it("an empty section that says so is ready (its real height)", () => {
    expect(tileContentReady(card(`<section data-records-section-card><h2>Colors</h2><p>Nothing here yet.</p></section>`), VISIBLE)).toBe(true);
  });

  it("a section still loading its rows (aria-busy) is not", () => {
    const loading = `<section data-records-section-card><h2>Colors</h2><div aria-busy="true"><div></div><div></div></div></section>`;
    expect(tileContentReady(card(loading), VISIBLE)).toBe(false);
  });

  it("the records-ui skeleton (lazy SectionCard) is not", () => {
    expect(tileContentReady(card(`<div role="status" aria-busy="true" data-records-skeleton="list"></div>`), VISIBLE)).toBe(false);
  });

  it("the board's own placeholder (before first paint, a suspended body) is not", () => {
    expect(tileContentReady(card(`<div data-tile-skeleton="doc" aria-hidden><div></div></div>`), VISIBLE)).toBe(false);
  });

  it("a body that rendered nothing yet (a lazy chunk's null) is not", () => {
    expect(tileContentReady(card(``), VISIBLE)).toBe(false);
    expect(tileContentReady(card(`<div class="prose"></div>`), VISIBLE)).toBe(false);
  });

  it("a hidden page or a card with no box is not", () => {
    expect(tileContentReady(card(ROWS), { visibilityState: "hidden" })).toBe(false);
    expect(tileContentReady(card(ROWS, 0), VISIBLE)).toBe(false);
  });
});

describe("BoardTile writes a measured height only when the content is ready", () => {
  const src = readFileSync(join(__dirname, "../components/BoardTile.tsx"), "utf8");

  it("the auto-height write is gated", () => {
    const write = src.slice(src.indexOf("const write = () => {"), src.indexOf("autoHeightChange(rectRef.current.h, card.offsetHeight)"));
    expect(write).toMatch(/if \(!tileContentReady\(card\)\) return;/);
  });

  it("the grow-to-fit measure is gated", () => {
    const measure = src.slice(src.indexOf("const measure = () => {"), src.indexOf("const boxes: ScrollerBox[] = [];"));
    expect(measure).toMatch(/if \(!tileContentReady\(card\)\) return;/);
  });
});
