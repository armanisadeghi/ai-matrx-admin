// components/dialogs/host/requestHostsOnOpen.ts
//
// PACKAGE-BACKED OPENERS THAT CANNOT IMPORT THE APP. `promptForValues` (valuePromptsOpener) and
// `openConversationRename` (conversationRenameOpener) live in @ai-matrx/chat and call
// `opener.open()` only — a call before any pointer/key/touch/drag/paste never loaded the lazy
// <DialogHosts /> body, so the queued request waited forever for a host nobody mounted.
// Their `open` is wrapped here, once, so every call opens the engagement latch first.
// (Same effect `cantRemoveOpener` / `manualCopyOpener` get by calling `requestDialogHosts()`
// themselves.) Imported statically by <DialogHosts /> and by the value-prompts shim; zero React.

import { conversationRenameOpener } from "@ai-matrx/chat/agents/components/conversation-actions/rename/conversationRenameOpener";
import { valuePromptsOpener } from "@ai-matrx/chat/ui/valuePromptsOpener";
import { requestDialogHosts } from "./dialogHostsLatch";

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
wrap(conversationRenameOpener as unknown as OpensDialog);
