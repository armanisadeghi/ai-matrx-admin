// Per-subject instance ids of the openers that derive one (one window per task / conversation).
// Shared by the opener modules and the lazy chat opener specs, which must know a handle's
// `instanceId` before the opener code loads (features/overlays/chat-window-openers.ts).

/** The task editor window for one task. */
export function taskEditorInstanceId(taskId: string): string {
  return `task-${taskId}`;
}

/** The working-document window for one conversation. */
export function workingDocumentInstanceId(conversationId: string): string {
  return `workingDocumentWindow:${conversationId}`;
}
