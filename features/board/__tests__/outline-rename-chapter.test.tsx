/**
 * A chapter is renamed from the outline rail (double-click its row, or its pencil) — it used to be
 * renamable only on the frame itself (FEATURE.md Open, 2026-10-17). The rename is the frame's own title.
 */
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, ...p }: { children: React.ReactNode }) => <a {...p}>{children}</a> }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { BoardOutline } from "../components/BoardOutline";
import type { BoardFrame } from "../board/board-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const frames: BoardFrame[] = [
  { id: "frame:a", title: "Overview", rect: { x: 0, y: 0, w: 900, h: 400 } },
  { id: "frame:b", title: "Colors", rect: { x: 0, y: 500, w: 900, h: 400 } },
];

function mount(onRename: (id: string, title: string) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <BoardOutline open mobile={false} frames={frames} store={null} layout="page" pages={null} onRenameChapter={onRename} onClose={() => undefined} />,
    ),
  );
  return { host, unmount: () => act(() => root.unmount()) };
}

const type = (input: HTMLInputElement, value: string) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

describe("renaming a chapter from the outline", () => {
  it("the pencil opens an input; Enter saves the frame's new title", () => {
    const onRename = jest.fn();
    const { host, unmount } = mount(onRename);
    act(() => (host.querySelector('[aria-label="Rename Colors"]') as HTMLButtonElement).click());
    const input = host.querySelector('input[aria-label="Chapter name"]') as HTMLInputElement;
    expect(input.value).toBe("Colors");
    type(input, "Brand colors");
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    act(() => input.blur());
    expect(onRename).toHaveBeenCalledWith("frame:b", "Brand colors");
    unmount();
  });

  it("Escape and an unchanged name rename nothing", () => {
    const onRename = jest.fn();
    const { host, unmount } = mount(onRename);
    act(() => host.querySelector("li button")!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    const input = host.querySelector('input[aria-label="Chapter name"]') as HTMLInputElement;
    type(input, "Something else");
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    act(() => input.blur());
    expect(onRename).not.toHaveBeenCalled();
    unmount();
  });
});
