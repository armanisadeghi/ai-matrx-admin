/**
 * A menu row that opens a dialog must not pull the caret back to the document while the dialog is
 * open (Escape / its X must close it); once it closes, the caret returns to the document.
 * Forcing test: plant the old behaviour (restore regardless of dialogs) and the first expectation fails.
 */
import { rememberEditorFocus, restoreEditorFocus } from "../EditorMenuBar";

const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("restoreEditorFocus with a dialog opened from a menu row", () => {
  it("leaves the dialog its focus, then gives the document the caret back", async () => {
    document.body.innerHTML = `<div id="doc" contenteditable="true" tabindex="0"></div><button data-editor-menubar-trigger id="t">File</button>`;
    const doc = document.getElementById("doc")!;
    doc.focus();
    rememberEditorFocus();
    // the row ran: a dialog is mounted and holds focus
    const dlg = document.createElement("div");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("data-state", "open");
    dlg.innerHTML = `<button id="x">x</button>`;
    document.body.appendChild(dlg);
    dlg.querySelector("button")!.focus();
    restoreEditorFocus(new Event("focus"));
    await raf();
    expect(document.activeElement?.id).toBe("x");
    // dialog closes (Escape)
    dlg.remove();
    await wait(200);
    expect(document.activeElement).toBe(doc);
  });

  it("restores at once when no dialog opened", async () => {
    document.body.innerHTML = `<div id="doc" contenteditable="true" tabindex="0"></div>`;
    const doc = document.getElementById("doc")!;
    doc.focus();
    rememberEditorFocus();
    (document.activeElement as HTMLElement).blur();
    restoreEditorFocus(new Event("focus"));
    await raf();
    expect(document.activeElement).toBe(doc);
  });
});
