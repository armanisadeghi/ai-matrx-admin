/**
 * @jest-environment jsdom
 */
// THE TOOLBAR'S UNDO AFTER A MODE SWITCH REACHES THE NOTE'S HISTORY (review 2026-10-19 #7).
// The remounted editor has no steps of its own; the note registers its record history on the
// editor's container, and the shared format target hands Undo / Redo to it.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { hostHistoryFor } from "@ai-matrx/rich-content/editor/format/format-target";
import { useNoteHostHistory } from "../hooks/useNoteHostHistory";

function Host({ calls }: { calls: string[] }) {
  const root = React.useRef<HTMLDivElement>(null);
  useNoteHostHistory(root, () => calls.push("undo"), () => calls.push("redo"));
  return (
    <div ref={root}>
      <div data-testid="inner" />
    </div>
  );
}

it("registers the note's history for every editor inside, and removes it on unmount", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const calls: string[] = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Host calls={calls} />));
  const inner = container.querySelector("[data-testid='inner']")!;
  const history = hostHistoryFor(inner);
  expect(history).not.toBeNull();
  history!.undo();
  history!.redo();
  expect(calls).toEqual(["undo", "redo"]);
  act(() => root.unmount());
  expect(hostHistoryFor(inner)).toBeNull();
});
