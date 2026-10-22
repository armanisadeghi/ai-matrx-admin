/**
 * Surface manifest — Messenger (`matrx-user/messenger`), route `/messenger`.
 *
 * The messenger look over the person-to-person inbox: the same conversations, thread and
 * `ConversationPane` as `/messages`, so it inherits every `matrx-user/messages` value (unread count,
 * conversations, the open conversation) and adds the one thing an agent may do here: fill the
 * composer. Sending stays the person's press — it goes to ANOTHER PERSON under their name.
 *
 * Emitters: `MessengerPeopleRoute` (provider; list values through `useMessagesSurfaceScope`) and
 * `MessagesComposerInput` (the composer contributes `composer_text` and registers its write handler
 * when it renders under this surface).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const MESSENGER_SURFACE_NAME = "matrx-user/messenger";

const values: SurfaceValue[] = [
  {
    name: "composer_text",
    label: "Message being written",
    description: "What is typed in the open conversation's message box right now, not sent. Absent when no conversation is open.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 200,
    inlineUpTo: 4000,
    sortOrder: 500,
  },
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "composer_text",
    label: "Write the message",
    description:
      "Fill the open conversation's message box for the person to read and send. NOTHING is sent: the person presses Send. Value is the message text (replaces what is typed; send an anchored edit to change part of it). Refused: no conversation is open.",
    valueType: "string",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "composer_text",
    patchable: true,
    approvalComparison: "text-replacement",
    sortOrder: 500,
  },
];

const declared: SurfaceManifest = {
  surfaceName: MESSENGER_SURFACE_NAME,
  situation: "They are in Messenger. You can write a message into the open conversation's box; they send it.",
  inheritsFrom: "matrx-user/messages",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Messenger",
  description: "Person-to-person messages in the messenger layout, with the composer an agent can fill.",
  urlPattern: "/messenger",
  values,
  writeTargets,
};

export const messengerManifest = declared;

export function createMessengerScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
