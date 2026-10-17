/**
 * Guard — the web's Delete-message dialog host offers "Move this message and its reply to Trash".
 * Deleting a user message alone leaves its answer hanging after nothing; the package dialog shows
 * the third choice only when this host passes the handler, so the host must pass it (and only when
 * the message has a reply).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(__dirname, "..", "hosts", "ChatMessageDialogs.tsx"),
  "utf8",
);

describe("ChatMessageDialogs", () => {
  it("passes the package's reply handler to the Delete dialog, only when a reply exists", () => {
    expect(source).toContain("useDeleteMessageWithReply");
    expect(source).toContain(
      "onConfirmDeleteWithReply={hasReply ? confirmDeleteWithReply : undefined}",
    );
  });
});
