/**
 * @jest-environment jsdom
 *
 * A RIGHT-CLICK ON A CHAT ANSWER'S TABLE OFFERS "SAVE TO A TABLE" ON THAT TABLE (lane
 * TABLE-EXPERIENCE A03). The answer's menu is one menu over the whole answer; its content is the
 * answer's text, whose FIRST shape (a bullet list above the table) opened the one overlay — the
 * table the person clicked was never what was saved. RED on HEAD: the overlay's text was the whole
 * answer; GREEN: it is the clicked table's header + rows, read from the rendered DOM.
 */
import "@/__tests__/helpers/configure-chat-fake-host";
import { _resetChatHostForTests, configureChat } from "@ai-matrx/chat/host";
import { createFakeDb } from "@ai-matrx/chat/testing/fake-db";
import { ensureWebRichDocumentRegistrations } from "@/features/rich-content-host/rich-document-registrations";
import { getAction } from "@ai-matrx/rich-content/rich-document/actions/provider";
import { chatContext } from "@/features/rich-document/test-utils/chatContext";
import { preloadTableShape, tableTextAtTarget } from "@ai-matrx/context-menu/engine";

// Chat's message actions and this app's handlers, before any registry read.
ensureWebRichDocumentRegistrations();

const ANSWER = `<div>
  <ul><li>Apple</li><li>Strawberry</li><li>Orange</li></ul>
  <p>Fruits provide vitamins.</p>
  <table><thead><tr><th>Fruit</th><th>Color</th></tr></thead>
  <tbody><tr><td>Apple</td><td>Red</td></tr><tr><td>Orange</td><td>Orange</td></tr></tbody></table>
</div>`;

beforeAll(() => preloadTableShape());

it("reads the clicked table with its header and rows, and nothing from the list above it", () => {
  document.body.innerHTML = ANSWER;
  const cell = document.querySelector("td") as HTMLElement;
  const text = tableTextAtTarget(cell)!;
  expect(text).toContain("Fruit");
  expect(text).toContain("Red");
  expect(text).not.toContain("Strawberry");
  expect(tableTextAtTarget(document.querySelector("p"))).toBeNull();
});

it("Save to a table opens the one overlay on the clicked table, not the answer's first shape", async () => {
  // The package opens the window through the chat host's windows port (the web wires it to the overlay store).
  const open = jest.fn();
  _resetChatHostForTests();
  configureChat({ db: createFakeDb().db, windows: { open } as never });
  document.body.innerHTML = ANSWER;
  const cell = document.querySelector("td") as HTMLElement;
  const dispatch = jest.fn();
  const answerText = "- Apple\n- Strawberry\n- Orange\n\nFruits provide vitamins.\n\n| Fruit | Color |\n| --- | --- |\n| Apple | Red |\n";
  const ctx = chatContext("assistant", {
    dispatch,
    content: answerText,
    callbacks: { tableAtTarget: () => tableTextAtTarget(cell) },
  });
  await getAction("save-table-as-data")!.run(ctx);
  const opened = open.mock.calls.find((c) => c[0] === "saveToTable");
  expect(opened).toBeDefined();
  expect(opened![1].text).toContain("Red");
  expect(opened![1].text).not.toContain("Strawberry");
});
