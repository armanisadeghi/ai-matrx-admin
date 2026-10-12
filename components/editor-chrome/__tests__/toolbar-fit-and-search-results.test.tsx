/**
 * The toolbar never hides a control behind a scrollbar: what does not fit folds into "more"
 * (`fitCount`), and the Menus results are a portal on <body> (the toolbar clips its own overflow)
 * that never changes the box's width on focus. The tab title follows the file name.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { MenusSearch } from "../EditorToolbar";
import { EditorTitleField } from "../EditorTitleField";
import { fitCount, MORE_BUTTON_WIDTH } from "../useFitCount";
import type { EditorMenu } from "../editor-menu-model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("fitCount", () => {
  const items = [30, 30, 30, 30]; // four 30px items, 2px gaps
  it("keeps everything when it all fits (no room reserved for more)", () => {
    expect(fitCount(items, 100, 100 + 4 * 32, 2)).toBe(4);
  });
  it("folds the tail into more, leaving room for the more button", () => {
    // room for fixed 100 + 2 items (64) + more (32) + gap
    expect(fitCount(items, 100, 100 + 2 * 32 + MORE_BUTTON_WIDTH + 2, 2)).toBe(2);
  });
  it("shows none of the items when only the fixed parts fit", () => {
    expect(fitCount(items, 100, 110, 2)).toBe(0);
  });
});

describe("Menus search", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });
  const run = jest.fn();
  const menus: EditorMenu[] = [
    { id: "format", label: "Format", items: [{ kind: "action", id: "format.merge", label: "Merge all", run }] },
  ];
  const type = (input: HTMLInputElement, value: string) =>
    act(() => {
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("renders results on <body>, outside the clipped toolbar, and Enter runs the highlighted one", () => {
    act(() =>
      root.render(
        <div data-editor-toolbar="" style={{ overflow: "hidden" }}>
          <MenusSearch menus={menus} />
        </div>,
      ),
    );
    const input = host.querySelector("input") as HTMLInputElement;
    type(input, "merge");
    const list = document.querySelector("[data-editor-menus-results]") as HTMLElement;
    expect(list).not.toBeNull();
    expect(host.contains(list)).toBe(false);
    expect(list.parentElement).toBe(document.body);
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not widen the box when focused", () => {
    act(() => root.render(<MenusSearch menus={menus} />));
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.className).not.toMatch(/focus:w-/);
  });

  it("the tab title is the saved file name, and the old title comes back on leaving", () => {
    document.title = "Workbooks - AI Matrx";
    act(() => root.render(<EditorTitleField value="Q3 budget" editable placeholder="Untitled" onCommit={async () => {}} />));
    expect(document.title).toBe("Q3 budget - AI Matrx");
    act(() => root.render(<EditorTitleField value="Q4 budget" editable placeholder="Untitled" onCommit={async () => {}} />));
    expect(document.title).toBe("Q4 budget - AI Matrx");
    act(() => root.render(<div />));
    expect(document.title).toBe("Workbooks - AI Matrx");
  });
});
