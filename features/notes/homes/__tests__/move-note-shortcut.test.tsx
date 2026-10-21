/** @jest-environment jsdom */
//
// Ctrl/⌘+Shift+M pressed inside the note editor opened the home picker AND inserted an equation:
// the editor's own keydown handler ran first, the window listener second (walk 2026-10-21).
// The move shortcut is taken in the capture phase and never reaches the editor.

import React, { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useMoveNoteShortcut } from "../useMoveNoteShortcut";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Surface({ onMove, editorKeydown }: { onMove: (id: string) => void; editorKeydown: (e: KeyboardEvent) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useMoveNoteShortcut(ref, "note-1", onMove);
  return (
    <div ref={ref}>
      <div
        data-testid="editor"
        tabIndex={0}
        ref={(el) => {
          el?.addEventListener("keydown", editorKeydown);
        }}
      />
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("moves the active note and the editor never sees the keys", async () => {
  const onMove = jest.fn();
  const editorKeydown = jest.fn();
  await act(async () => root.render(<Surface onMove={onMove} editorKeydown={editorKeydown} />));
  const editor = container.querySelector('[data-testid="editor"]') as HTMLElement;
  editor.focus();
  const event = new KeyboardEvent("keydown", { key: "M", metaKey: true, shiftKey: true, bubbles: true, cancelable: true });
  editor.dispatchEvent(event);
  expect(onMove).toHaveBeenCalledWith("note-1");
  expect(editorKeydown).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
});

it("leaves other keys to the editor", async () => {
  const onMove = jest.fn();
  const editorKeydown = jest.fn();
  await act(async () => root.render(<Surface onMove={onMove} editorKeydown={editorKeydown} />));
  const editor = container.querySelector('[data-testid="editor"]') as HTMLElement;
  editor.focus();
  editor.dispatchEvent(new KeyboardEvent("keydown", { key: "m", metaKey: true, bubbles: true }));
  expect(onMove).not.toHaveBeenCalled();
  expect(editorKeydown).toHaveBeenCalledTimes(1);
});
