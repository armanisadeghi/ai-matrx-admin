/**
 * @jest-environment jsdom
 */
// An opener called BEFORE any pointer/key/touch/drag/paste must open the engagement latch,
// or its awaiting code hangs on a host that never loads. Covers the two package-backed openers
// (value prompts; conversation rename via the package hook) that only call `opener.open()`.

import * as latch from "../dialogHostsLatch";
import "../DialogHosts"; // the shell installs the wrapper for the rename opener
import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
import { CHAT_BEFORE_OPEN_SLOT } from "../requestHostsOnOpen";
import { valuePromptsOpener } from "@ai-matrx/chat/ui/valuePromptsOpener";

describe("package-backed openers request the dialog hosts", () => {
  beforeEach(() => {
    latch._resetDialogHostsLatchForTests();
    valuePromptsOpener._reset();
  });

  it("promptForValues opens the latch and the request reaches the host once it registers", async () => {
    expect(latch.isDialogHostsRequested()).toBe(false);
    const pending = promptForValues({ title: "t", fields: [{ name: "a", prompt: "A" }] });
    expect(latch.isDialogHostsRequested()).toBe(true);
    valuePromptsOpener._registerHost({ show: (_req, resolve) => resolve({ a: "x" }) });
    await expect(pending).resolves.toEqual({ a: "x" });
  });

  it("the chat package's before-open slot opens the latch (what conversationRenameOpener runs ahead of open)", () => {
    expect(latch.isDialogHostsRequested()).toBe(false);
    const hook = (globalThis as Record<symbol, unknown>)[Symbol.for(CHAT_BEFORE_OPEN_SLOT)] as () => void;
    expect(typeof hook).toBe("function");
    hook();
    expect(latch.isDialogHostsRequested()).toBe(true);
  });
});
