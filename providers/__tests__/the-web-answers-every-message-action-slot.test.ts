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

import { hasMessageActionSlot, type MessageActionSlotName } from "@ai-matrx/chat/host/message-action-slots";

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
