// providers/chatMessageActionSlots.ts
//
// This app's answers to the chat package's message-action services (@ai-matrx/chat
// host/message-action-slots, message-actions W3d): the "..." rows Save code to Scratch, Save to
// my Shapes, Create Task and a code block's Run in sandbox live in the package; the services they
// reach are this app's. Heavy services load on the first click.

import { registerChatUi } from "@ai-matrx/chat/host/ui-slots";
import type {
  MessageCodeFileInput,
  MessageKindInstancesInput,
  SandboxCodeRunInput,
} from "@ai-matrx/chat/host/message-action-slots";
import type { PendingSource } from "@ai-matrx/chat/agents/components/messages-display/message-options/pending-source";
import { getStore } from "@/lib/redux/store-singleton";

registerChatUi({
  codeFilesCreate: async (input: MessageCodeFileInput) => {
    const { CodeFilesAPI } = await import("@/features/code-files/service/codeFilesApi");
    return CodeFilesAPI.create(input);
  },
  saveKindInstancesFromMessage: async (input: MessageKindInstancesInput) => {
    const { saveKindInstancesFromMessage } = await import("@/features/content-ir/studio/message-kind-instances");
    return saveKindInstancesFromMessage(input);
  },
  openTaskQuickCreate: (source: PendingSource) => {
    const store = getStore();
    if (!store) throw new Error("The app store is not ready, so the task cannot be started.");
    void import("@/features/tasks/redux/taskUiSlice").then(({ setPendingSource }) => store.dispatch(setPendingSource(source)));
  },
  runCodeInSandbox: async (input: SandboxCodeRunInput) => {
    const { runCodeInSandbox } = await import("@/features/rich-document/code-block/code-run");
    return runCodeInSandbox(input);
  },
});
