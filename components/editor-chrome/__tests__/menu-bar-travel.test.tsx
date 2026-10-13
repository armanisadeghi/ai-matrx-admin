/**
 * Google's menu bar: with one menu open, pointing at (or arrowing to) the next one opens it and
 * it STAYS open. The caret goes back to the document only when every menu is closed.
 *
 * Regression (Arman, 2026-10-13): File → Edit opened Edit for a moment and closed it — the
 * closing File menu handed focus back to the document while Edit was opening, which Edit read
 * as a click outside.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { EditorMenuBar, useMenuBarState } from "../EditorMenuBar";
import type { EditorMenu } from "../editor-menu-model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const menus: EditorMenu[] = ["edit", "view", "insert"].map((id) => ({
  id,
  label: id[0]!.toUpperCase() + id.slice(1),
  items: [{ kind: "action", id: `${id}.one`, label: `${id} one`, run: () => {} }],
}));

function Host() {
  const state = useMenuBarState();
  return (
    <div>
      <textarea data-testid="doc" />
      <EditorMenuBar menus={menus} state={state} />
    </div>
  );
}

const trigger = (id: string) => document.querySelector<HTMLButtonElement>(`[data-editor-menu="${id}"]`)!;
const settle = async () => {
  for (let i = 0; i < 4; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
};
const pointer = (el: Element, type: string) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));

describe("menu bar travel", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeAll(() => {
    // jsdom lacks these; Radix calls them.
    window.HTMLElement.prototype.scrollIntoView ??= () => {};
    window.HTMLElement.prototype.hasPointerCapture ??= () => false;
    window.HTMLElement.prototype.releasePointerCapture ??= () => {};
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("pointing from one open menu to the next keeps the next one open; focus returns only when all close", async () => {
    act(() => root.render(<Host />));
    const doc = document.querySelector<HTMLTextAreaElement>('[data-testid="doc"]')!;
    doc.focus();
    act(() => pointer(trigger("edit"), "pointerdown"));
    await settle();
    expect(trigger("edit").getAttribute("data-state")).toBe("open");

    for (const next of ["view", "insert"]) {
      act(() => pointer(trigger(next), "pointerover"));
      await settle();
      expect(trigger(next).getAttribute("data-state")).toBe("open");
      expect(document.querySelectorAll('[role="menu"]').length).toBe(1);
      expect(document.activeElement).not.toBe(doc);
    }

    act(() => {
      document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await settle();
    expect(document.querySelectorAll('[role="menu"]').length).toBe(0);
    expect(document.activeElement).toBe(doc);
  });

  it("→ and ← move between menus (wrapping), like Google", async () => {
    act(() => root.render(<Host />));
    act(() => pointer(trigger("edit"), "pointerdown"));
    await settle();
    const key = (k: string) =>
      act(() => {
        (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      });
    key("ArrowRight");
    await settle();
    expect(trigger("view").getAttribute("data-state")).toBe("open");
    key("ArrowLeft");
    key("ArrowLeft");
    await settle();
    expect(trigger("insert").getAttribute("data-state")).toBe("open");
  });
});
