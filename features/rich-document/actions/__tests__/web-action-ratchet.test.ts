/**
 * G2 — THE WEB NEVER REGISTERS AN ACTION @ai-matrx/chat REGISTERS, AND ITS OWN LIST ONLY SHRINKS.
 *
 * The message "⋯" actions move from this app into @ai-matrx/chat one wave at a time. Two halves:
 *  - runtime: load every web handler with the registration recorded, and assert none of the ids
 *    the INSTALLED package registers (CHAT_MESSAGE_ACTION_IDS) is among them;
 *  - the ratchet script (scripts/check-rich-document-action-ratchet.mjs): its self-test, then the
 *    real check — no package id here, no new web-only id, no stale ratchet line, and staysWeb is
 *    exactly the web-only contexts (plan D8, plus comment-selection).
 * Red with a web copy of delete-message or edit-history (the W0 package actions) left in edit.ts.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { CHAT_MESSAGE_ACTION_IDS } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/register";

const recorded: string[] = [];
jest.mock("@/features/rich-document/actions/handlers/register-if-absent", () => ({
  registerActionIfAbsent: (action: { id: string }) => {
    recorded.push(action.id);
  },
}));

const ROOT = join(__dirname, "../../../..");
const SCRIPT = join(ROOT, "scripts/check-rich-document-action-ratchet.mjs");

it("no web handler registers an id the package registers", () => {
  require("@/features/rich-document/actions/handlers");
  // The walker is not blind: it records exactly the rows the ratchet file still lists here.
  const ratchet = require("../web-action-ratchet.json") as { staysWeb: string[]; awaitingMove: string[] };
  expect(recorded.length).toBe(ratchet.staysWeb.length + ratchet.awaitingMove.length);
  expect(CHAT_MESSAGE_ACTION_IDS.length).toBeGreaterThan(0);
  expect(recorded.filter((id) => CHAT_MESSAGE_ACTION_IDS.includes(id))).toEqual([]);
});

it("the ratchet script proves its rules can go red, then passes on this tree", () => {
  expect(() => execFileSync(process.execPath, [SCRIPT, "--self-test"], { cwd: ROOT, stdio: "pipe" })).not.toThrow();
  expect(() => execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: "pipe" })).not.toThrow();
});
