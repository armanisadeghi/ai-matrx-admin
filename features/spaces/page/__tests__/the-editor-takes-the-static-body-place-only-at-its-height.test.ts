/**
 * @jest-environment jsdom
 */
// THE EDITOR TAKES THE STATIC BODY'S PLACE ONLY AT ITS HEIGHT (lane SPACES-SHIFT-3, 2026-10-18).
//
// A Spaces page first paints its stored blocks read-only (static-body.tsx); the live editor is built behind
// it (`.spaces-editor-behind`, absolute, inset 0, overflow hidden) and swapped in when it paints the same
// height. The check compared the hidden layer's scrollHeight with the static body — but a layer pinned to
// the static body's box can never scroll SHORTER than it, so an editor whose database blocks had not drawn
// yet (a 6 px block where the static body showed a 300 px table) "matched" two frames after mount and was
// swapped in short. Its blocks then grew under the reader: CLS 0.47–0.54 for a viewer at 768 px on slow 4G.
// Heights are now the two layers' own ProseMirror boxes, a database block without its frame is still
// painting, and the time cap starts when nothing is painting any more.

import { REVEAL_CAP_MS, REVEAL_HARD_CAP_MS, revealStep, type RevealState } from "../reveal-when-painted";

const px = new WeakMap<Element, number>();
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      const h = px.get(this) ?? 0;
      return { x: 0, y: 0, top: 0, left: 0, width: 300, height: h, right: 300, bottom: h, toJSON: () => ({}) };
    },
  });
  // Like a browser: the hidden layer is the static body's box, so it scrolls at least that tall.
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.classList.contains("spaces-editor-behind")) return px.get(this) ?? 0;
      const stat = this.parentElement?.querySelector(":scope > .spaces-static-body .ProseMirror");
      const ed = this.querySelector(".ProseMirror");
      return Math.max(stat ? (px.get(stat) ?? 0) : 0, ed ? (px.get(ed) ?? 0) : 0);
    },
  });
});

/** A stack: the static body `staticPx` tall, the editor behind it `editorPx` tall, with `editorInner` inside its ProseMirror. */
function stack(staticPx: number, editorPx: number, editorInner = '<div class="bn-block-outer"><p>text</p></div>'): HTMLElement {
  const root = document.createElement("div");
  root.className = "spaces-body-stack";
  root.innerHTML = `<div class="spaces-static-body"><div class="bn-container"><div class="ProseMirror bn-editor">static</div></div></div><div class="spaces-editor-behind"><div class="bn-container"><div class="tiptap ProseMirror">${editorInner}</div></div></div>`;
  px.set(root.querySelector(".spaces-static-body")!, staticPx);
  px.set(root.querySelector(".spaces-static-body .ProseMirror")!, staticPx);
  px.set(root.querySelector(".spaces-editor-behind .ProseMirror")!, editorPx);
  px.set(root.querySelector(".spaces-editor-behind")!, staticPx);
  return root;
}

/** Runs frames 16 ms apart until a reveal (or `frames` frames); answers the frame time it revealed at, or null. */
function run(root: HTMLElement, frames: number, fromMs = 0): number | null {
  let state: RevealState = { same: 0, started: fromMs, settledAt: null };
  for (let i = 0; i < frames; i++) {
    const now = fromMs + i * 16;
    const step = revealStep(root, state, now);
    if (step.reveal) return now;
    state = step.state;
  }
  return null;
}

describe("the editor is swapped in for the static body only when it paints the same height", () => {
  it("an editor painted SHORTER than the static body is not swapped in (the hidden layer's scrollHeight hid it)", () => {
    // 60 frames ≈ 1 s: well before any cap.
    expect(run(stack(1200, 400), 60)).toBeNull();
  });

  it("an editor at the static body's height is swapped in after two frames", () => {
    expect(run(stack(1200, 1200), 60)).toBe(16);
  });

  it("a database block without its frame yet is still painting, even when the heights agree", () => {
    const db = '<div class="bn-block-outer"><div class="react-renderer node-database"><div class="bn-block-content"><div class="spaces-db-host"><div class="records-skeleton"></div></div></div></div></div>';
    expect(run(stack(1200, 1200, db), 60)).toBeNull();
    const drawn = '<div class="bn-block-outer"><div class="react-renderer node-database"><div class="bn-block-content"><div class="spaces-db-host"><div class="spaces-db-frame"></div></div></div></div></div>';
    expect(run(stack(1200, 1200, drawn), 60)).toBe(16);
  });

  it("the room's placeholder line (before the body syncs in) is still painting", () => {
    expect(run(stack(37, 37, '<div class="bn-block-outer" data-id="initialBlockId"><p></p></div>'), 60)).toBeNull();
  });

  it("an editor that settles at another height is swapped in REVEAL_CAP_MS after it stopped painting, not before", () => {
    const frames = Math.ceil((REVEAL_CAP_MS + 500) / 16);
    const at = run(stack(1200, 1100), frames);
    expect(at).not.toBeNull();
    expect(at!).toBeGreaterThan(REVEAL_CAP_MS);
  });

  it("an editor that never stops painting is swapped in at the hard cap", () => {
    const db = '<div class="bn-block-outer"><div class="spaces-db-loading"></div></div>';
    const at = run(stack(1200, 1200, db), Math.ceil((REVEAL_HARD_CAP_MS + 500) / 16));
    expect(at).not.toBeNull();
    expect(at!).toBeGreaterThan(REVEAL_HARD_CAP_MS);
  });
});
