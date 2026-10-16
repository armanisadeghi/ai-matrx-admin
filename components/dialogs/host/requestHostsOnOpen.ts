// components/dialogs/host/requestHostsOnOpen.ts
//
// PACKAGE-BACKED OPENERS THAT CANNOT IMPORT THE APP. `promptForValues` (valuePromptsOpener) and
// `openConversationRename` (conversationRenameOpener) live in @ai-matrx/chat and call
// `opener.open()` only — a call before any pointer/key/touch/drag/paste never loaded the lazy
// <DialogHosts /> body, so the queued request waited forever for a host nobody mounted.
//
// Two seams, both installed here (imported statically by <DialogHosts /> and the value-prompts shim):
//  1. The chat package runs an injected "before open" hook (a `globalThis` slot, so no import edge
//     and an older package simply never reads it) ahead of every package-owned opener — this is the
//     door for `conversationRenameOpener`, whose module the package does not export.
//  2. `valuePromptsOpener` IS exported, so its `open` is also wrapped directly: a call made through
//     an installed package that predates the hook still opens the latch.
// Same effect `cantRemoveOpener` / `manualCopyOpener` get by calling `requestDialogHosts()` themselves.

import { valuePromptsOpener } from "@ai-matrx/chat/ui/valuePromptsOpener";
import { requestDialogHosts } from "./dialogHostsLatch";

/** The slot the chat package reads (`@ai-matrx/chat/ui/openerBeforeOpen`). Part of its public name. */
export const CHAT_BEFORE_OPEN_SLOT = "ai-matrx.chat.opener-before-open";

(globalThis as Record<symbol, unknown>)[Symbol.for(CHAT_BEFORE_OPEN_SLOT)] = requestDialogHosts;

interface OpensDialog {
  open: (...args: never[]) => unknown;
  __requestsHosts?: true;
}

function wrap(opener: OpensDialog): void {
  if (opener.__requestsHosts) return;
  const original = opener.open;
  opener.open = ((...args: never[]) => {
    requestDialogHosts();
    return original.apply(opener, args);
  }) as OpensDialog["open"];
  opener.__requestsHosts = true;
}

wrap(valuePromptsOpener as unknown as OpensDialog);
