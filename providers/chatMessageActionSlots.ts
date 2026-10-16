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
import type { CodeFileSummary } from "@ai-matrx/chat/host/code-files";
import { getStore } from "@/lib/redux/store-singleton";
import type { AppDispatch } from "@/lib/redux/store";

// The code files (Save to Code, Save code to Scratch) go through this app's code-files store, so an
// open code editor and the library see the saved file at once.
function codeFilesStore() {
  const store = getStore();
  if (!store) throw new Error("The app store is not ready, so the code file cannot be saved.");
  // The singleton is typed loosely; its dispatch is the app's thunk dispatch (`.unwrap()` included).
  return { dispatch: store.dispatch as AppDispatch };
}
const codeThunks = () => import("@/features/code-files/redux/thunks");
const codeApi = async () => (await import("@/features/code-files/service/codeFilesApi")).CodeFilesAPI;
const summaryOf = (f: { id: string; name: string; folder_id: string | null; language: string }): CodeFileSummary => ({ id: f.id, name: f.name, folderId: f.folder_id, language: f.language });

registerChatUi({
  codeFilesCreate: async ({ folderId, ...input }: MessageCodeFileInput) => {
    const { createCodeFileThunk } = await codeThunks();
    const file = await codeFilesStore().dispatch(createCodeFileThunk({ ...input, folder_id: folderId ?? null })).unwrap();
    return summaryOf(file);
  },
  codeFilesListFolders: async () => (await (await codeApi()).listFolders()).map((f) => ({ id: f.id, name: f.name })),
  codeFilesCreateFolder: async (name: string) => {
    const { createCodeFolderThunk } = await codeThunks();
    const folder = await codeFilesStore().dispatch(createCodeFolderThunk({ name })).unwrap();
    return { id: folder.id, name: folder.name };
  },
  codeFilesList: async () => (await (await codeApi()).listMetadata()).filter((f) => !f.deleted_at).map(summaryOf),
  codeFilesRead: async (id: string) => {
    const { loadCodeFileFull } = await codeThunks();
    const file = await codeFilesStore().dispatch(loadCodeFileFull({ id, force: true })).unwrap();
    if (!file) throw new Error("That code file is gone or you can't open it.");
    return file.content ?? "";
  },
  codeFilesWrite: async ({ id, content }: { id: string; content: string }) => {
    const store = codeFilesStore();
    const [{ loadCodeFileFull, saveFileNow }, { codeFilesActions }] = await Promise.all([codeThunks(), import("@/features/code-files/redux/slice")]);
    await store.dispatch(loadCodeFileFull({ id })).unwrap();
    store.dispatch(codeFilesActions.setLocalContent({ id, content }));
    const saved = await store.dispatch(saveFileNow({ id })).unwrap();
    if (!saved) throw new Error("The code file did not save.");
    return summaryOf(saved);
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

// Save to Notes (the package's Quick Note Save window): this app's notes slice, homes and openers.
import { useWebQuickSaveNotes } from "@/features/notes/actions/quick-save/useWebQuickSaveNotes";
registerChatUi({ useQuickSaveNotes: useWebQuickSaveNotes });

// Summarize & listen (the package's window): this app's streaming speaker and audio sessions.
import "@/providers/chatListenHost";
