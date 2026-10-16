/**
 * @jest-environment jsdom
 */
// An opener called BEFORE any pointer/key/touch/drag/paste must open the engagement latch,
// or its awaiting code hangs on a host that never loads. Covers the two package-backed openers
// (value prompts, conversation rename) that only call `opener.open()`.

import * as latch from "../dialogHostsLatch";
import "../DialogHosts"; // the shell installs the wrapper for the rename opener
import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
import { conversationRenameOpener } from "@ai-matrx/chat/agents/components/conversation-actions/rename/conversationRenameOpener";
import { valuePromptsOpener } from "@ai-matrx/chat/ui/valuePromptsOpener";

describe("package-backed openers request the dialog hosts", () => {
  beforeEach(() => {
    latch._resetDialogHostsLatchForTests();
    valuePromptsOpener._reset();
    conversationRenameOpener._reset();
  });

  it("promptForValues opens the latch and the request reaches the host once it registers", async () => {
    expect(latch.isDialogHostsRequested()).toBe(false);
    const pending = promptForValues({ title: "t", fields: [{ name: "a", prompt: "A" }] });
    expect(latch.isDialogHostsRequested()).toBe(true);
    valuePromptsOpener._registerHost({ show: (_req, resolve) => resolve({ a: "x" }) });
    await expect(pending).resolves.toEqual({ a: "x" });
  });

  it("the conversation rename opener opens the latch and the dialog opens when the host registers", async () => {
    expect(latch.isDialogHostsRequested()).toBe(false);
    const pending = conversationRenameOpener.open({ conversationId: "c1", title: "old" });
    expect(latch.isDialogHostsRequested()).toBe(true);
    conversationRenameOpener._registerHost({ show: (req, resolve) => resolve(req.conversationId === "c1") });
    await expect(pending).resolves.toBe(true);
  });
});
