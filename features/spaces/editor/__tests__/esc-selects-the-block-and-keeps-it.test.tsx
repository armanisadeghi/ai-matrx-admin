/**
 * @jest-environment jsdom
 */
// ESC SELECTS THE BLOCK AND KEEPS IT SELECTED (Notion B7, lane CLOSE-TPL round 2, 2026-10-21).
//
// On a real Space page Esc did nothing: the editor's key layer (React, listening on the document in the
// capture phase, registered first) selected the block on Escape, and the SAME key event then reached the
// block selection's own document listener, which saw a selection and cleared it ("Esc clears"). The press
// that makes a selection must never also be the press that clears it: a key the editor already handled
// (defaultPrevented) is not the selection's. A second Esc, on the selection, still clears it.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { selectBlocks, useRubberBand } from "../rubber-band";
import type { SpacesEditor } from "../schema";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const blue = () => document.getElementById("spaces-rubber-band")?.textContent ?? "";

function Host({ editor }: { editor: SpacesEditor }) {
  useRubberBand(editor, true);
  return null;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let editorLayer: ((e: KeyboardEvent) => void) | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  if (editorLayer) document.removeEventListener("keydown", editorLayer, true);
  editorLayer = null;
});

test("Esc in the text selects its block, and the same press does not clear it; the next Esc does", () => {
  // The editor's key layer: registered on the document, capture phase, BEFORE the block selection.
  editorLayer = (e: KeyboardEvent) => {
    if (e.key === "Escape" && document.activeElement?.id === "line" && selectBlocks(["b"])) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener("keydown", editorLayer, true);
  host = document.createElement("div");
  host.innerHTML = '<div id="line" tabindex="0">Book the room</div>';
  document.body.appendChild(host);
  const line = host.querySelector<HTMLElement>("#line")!;
  const editor = { prosemirrorView: { dom: line } } as unknown as SpacesEditor;
  root = createRoot(host.appendChild(document.createElement("div")));
  act(() => root!.render(<Host editor={editor} />));

  line.focus();
  line.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  expect(blue()).toContain('data-id="b"');

  // The caret left the text: the next Esc is the selection's, and clears it.
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  expect(blue()).toBe("");
});
