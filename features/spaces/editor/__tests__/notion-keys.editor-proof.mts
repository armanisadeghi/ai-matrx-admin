// features/spaces/editor/__tests__/notion-keys.editor-proof.mts — the Notion keys BlockNote lacked (PARITY B7).
//   bash features/spaces/editor/__tests__/run-editor-proof.sh notion-keys
// Cmd+A: the first press selects the current block's text, the second answers "page" (every block).
// Cmd+Shift+H: the last color used goes on the selected words; with none used yet, a yellow highlight;
// with nothing selected the key does nothing. BlockNote's default schema: these keys use no Spaces block.

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, DOMParser: dom.window.DOMParser, getComputedStyle: dom.window.getComputedStyle, localStorage: dom.window.localStorage });

async function main() {
  const { BlockNoteEditor } = await import("@blocknote/core");
  const keys = await import("../notion-keys");
  type E = import("../schema").SpacesEditor;
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "a", type: "paragraph", content: "Plan the launch party" },
      { id: "b", type: "paragraph", content: "Book the room" },
    ],
  } as never) as unknown as { mount: (el: HTMLElement) => void };
  editor.mount(document.createElement("div"));
  const e = editor as unknown as E;
  const sel = () => {
    const s = e.prosemirrorState.selection;
    return e.prosemirrorState.doc.textBetween(s.from, s.to);
  };
  const r: Record<string, unknown> = {};

  e.setTextCursorPosition("a", "end");
  r.firstPress = keys.selectAllStep(e);
  r.firstPressSelectsBlockText = sel() === "Plan the launch party";
  r.secondPress = keys.selectAllStep(e);
  r.pageIds = keys.pageBlockIds(e).join(",");

  // Cmd+Shift+H with nothing used yet: the yellow highlight.
  r.defaultApplied = keys.applyLastColor(e);
  r.defaultIsYellowHighlight = JSON.stringify(e.getActiveStyles()) .includes('"backgroundColor":"yellow"');
  // A color picked once is the one the key applies next.
  e.setTextCursorPosition("b", "end");
  keys.selectAllStep(e);
  keys.rememberColor({ style: "textColor", color: "red" });
  r.lastApplied = keys.applyLastColor(e);
  r.lastIsRedText = JSON.stringify(e.getActiveStyles()).includes('"textColor":"red"');
  // Nothing selected: the key is left to the browser.
  e.setTextCursorPosition("b", "end");
  r.collapsedLeftAlone = keys.applyLastColor(e) === false;

  console.log(JSON.stringify(r, null, 1));
  const ok =
    r.firstPress === "block" && r.firstPressSelectsBlockText && r.secondPress === "page" && r.pageIds === "a,b" &&
    r.defaultApplied && r.defaultIsYellowHighlight && r.lastApplied && r.lastIsRedText && r.collapsedLeftAlone;
  console.log(ok ? "PASS notion-keys" : "FAIL notion-keys");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
