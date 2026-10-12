/**
 * The title saves the Google way (Enter or blur, trimmed; Escape and a failed
 * save put the saved name back; a peer's rename lands unless mid-edit), and the
 * Menus search finds a command anywhere in the tree.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { EditorTitleField } from "../EditorTitleField";
import { flattenMenus, formatShortcut, matchesShortcut, searchActions, type EditorMenu } from "../editor-menu-model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const flush = () => act(async () => {});

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
const render = (el: React.ReactElement) => {
  act(() => root.render(el));
  return { rerender: (next: React.ReactElement) => act(() => root.render(next)) };
};
const screen = { getByLabelText: (label: string) => host.querySelector(`[aria-label="${label}"]`) as HTMLElement };
const setValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
const fireEvent = {
  focus: (el: HTMLElement) => act(() => el.focus()),
  blur: (el: HTMLElement) => act(() => el.blur()),
  change: (el: HTMLElement, init: { target: { value: string } }) => act(() => setValue(el as HTMLInputElement, init.target.value)),
  keyDown: (el: HTMLElement, init: { key: string }) =>
    act(() => {
      el.dispatchEvent(new KeyboardEvent("keydown", { key: init.key, bubbles: true }));
    }),
};

describe("EditorTitleField", () => {
  it("Enter saves the trimmed name", async () => {
    const onCommit = jest.fn().mockResolvedValue(undefined);
    render(<EditorTitleField value="Budget" editable placeholder="Untitled" onCommit={onCommit} />);
    const input = screen.getByLabelText("Rename") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "  Q3 budget  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    await flush();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("Q3 budget");
  });

  it("Escape and an unchanged name save nothing", async () => {
    const onCommit = jest.fn().mockResolvedValue(undefined);
    render(<EditorTitleField value="Budget" editable placeholder="Untitled" onCommit={onCommit} />);
    const input = screen.getByLabelText("Rename") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Other" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("Budget");
    fireEvent.blur(input);
    await flush();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("a failed save puts the saved name back", async () => {
    const onCommit = jest.fn().mockRejectedValue(new Error("denied"));
    render(<EditorTitleField value="Budget" editable placeholder="Untitled" onCommit={onCommit} />);
    const input = screen.getByLabelText("Rename") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "New name" } });
    fireEvent.blur(input);
    await flush();
    expect(input.value).toBe("Budget");
  });

  it("a collaborator's rename replaces the text, but never mid-edit", async () => {
    const onCommit = jest.fn().mockResolvedValue(undefined);
    const { rerender } = render(<EditorTitleField value="Budget" editable placeholder="Untitled" onCommit={onCommit} />);
    const input = screen.getByLabelText("Rename") as HTMLInputElement;
    rerender(<EditorTitleField value="Budget 2026" editable placeholder="Untitled" onCommit={onCommit} />);
    expect(input.value).toBe("Budget 2026");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Mine" } });
    rerender(<EditorTitleField value="Theirs" editable placeholder="Untitled" onCommit={onCommit} />);
    expect(input.value).toBe("Mine");
  });

  it("a viewer cannot edit", () => {
    render(<EditorTitleField value="Budget" editable={false} placeholder="Untitled" onCommit={jest.fn()} />);
    expect((screen.getByLabelText("Rename") as HTMLInputElement).readOnly).toBe(true);
  });
});

describe("menu model", () => {
  const run = jest.fn();
  const menus: EditorMenu[] = [
    {
      id: "view",
      label: "View",
      items: [
        {
          kind: "submenu",
          id: "view.freeze",
          label: "Freeze",
          keywords: ["pin"],
          items: [{ kind: "action", id: "view.freeze.rows-1", label: "1 row", run }],
        },
      ],
    },
  ];

  it("Menus search finds nested rows by label, path and keywords", () => {
    const flat = flattenMenus(menus);
    expect(searchActions(flat, "freeze row").map((a) => a.id)).toEqual(["view.freeze.rows-1"]);
    expect(searchActions(flat, "pin").map((a) => a.id)).toEqual(["view.freeze.rows-1"]);
    expect(searchActions(flat, "bold")).toEqual([]);
  });

  it("shortcuts print and match the Google way", () => {
    expect(formatShortcut({ key: "5", mod: true, shift: true }, true)).toBe("⌘⇧5");
    expect(formatShortcut({ key: "5", mod: true, shift: true }, false)).toBe("Ctrl+Shift+5");
    const e = { key: "%", code: "Digit5", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false };
    expect(matchesShortcut(e, { key: "5", mod: true, shift: true }, true)).toBe(true);
    expect(matchesShortcut(e, { key: "5", mod: true }, true)).toBe(false);
  });
});
