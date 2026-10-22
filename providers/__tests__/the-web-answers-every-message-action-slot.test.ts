/**
 * THE WEB ANSWERS EVERY MESSAGE-ACTION SERVICE THE CHAT PACKAGE'S "..." ROWS REACH (message-actions
 * W3d). Save code to Scratch, Save to my Shapes, Create Task and a code block's Run in sandbox live
 * in @ai-matrx/chat; a host that registers none of their services gets the announced stand-in. The
 * web must never fall to the stand-in: each slot is registered, and the registration module is
 * loaded by the app's one ui-slot registration.
 *
 * Proven red by planting: dropping `openTaskQuickCreate` from providers/chatMessageActionSlots.ts
 * fails the first case; dropping its import from chatUiRegistrationBase.ts fails the second.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("@/lib/redux/store-singleton", () => ({ getStore: () => null }));
jest.mock("@/features/code-files/service/codeFilesApi", () => ({
  CodeFilesAPI: {
    listMetadata: async () => [
      { id: "locked", name: "locked.py", folder_id: null, language: "python", is_readonly: true, deleted_at: null },
      { id: "open", name: "open.py", folder_id: null, language: "python", is_readonly: false, deleted_at: null },
    ],
  },
}));

import { hasMessageActionSlot, type MessageActionSlotName } from "@ai-matrx/chat/host/message-action-slots";
import { codeFilesList } from "@ai-matrx/chat/host/code-files";

const SLOTS: MessageActionSlotName[] = ["codeFilesCreate", "saveKindInstancesFromMessage", "openTaskQuickCreate", "runCodeInSandbox"];

it("registers every message-action service", () => {
  require("@/providers/chatMessageActionSlots");
  expect(SLOTS.filter((name) => !hasMessageActionSlot(name))).toEqual([]);
});

it("the app's ui-slot registration loads it", () => {
  const base = readFileSync(join(__dirname, "..", "chatUiRegistrationBase.ts"), "utf8");
  expect(base).toMatch(/^import "@\/providers\/chatMessageActionSlots";$/m);
});

it("the read-aloud setting door opens the preferences window at the read-aloud control", () => {
  const adapter = readFileSync(join(__dirname, "..", "ChatHostAdapter.tsx"), "utf8");
  expect(adapter).toMatch(/"read-aloud": VOICE_SETTING_DOORS\.readAloud/);
  expect(adapter).toMatch(/openSettingDoor\(setting\)/);
});

// The chat's code editor window opens a locked code file read-only only if this host says it is locked.
// Proven red by planting: dropping the is_readonly mapping from summaryOf fails this case.
it("a locked code file (is_readonly) is listed read-only to the chat's code editor window", async () => {
  require("@/providers/chatMessageActionSlots");
  // readOnly is CodeFileSummary's from @ai-matrx/chat 0.8.308; read structurally so this compiles on either side of it.
  const files = (await codeFilesList()) as ReadonlyArray<{ id: string; readOnly?: boolean }>;
  expect(files.find((f) => f.id === "locked")?.readOnly).toBe(true);
  expect(files.find((f) => f.id === "open")?.readOnly ?? false).toBe(false);
});
