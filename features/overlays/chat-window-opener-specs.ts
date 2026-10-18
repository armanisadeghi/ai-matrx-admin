"use client";

// The chat window openers this app registers, as LAZY openers (P18 + W5): first load carries this
// list and the ids only; the opener code is ONE chunk (chat-window-openers.ts) imported by the first
// open. Instance openers name how their handle's id is known before that chunk loads (the type
// demands it); per-subject ids come from definitions/opener-instance-ids.ts, shared with the openers.

import { lazyChatWindowOpeners, type LazyChatWindowOpenerSpecs } from "@ai-matrx/chat/host";
import type { AppStore } from "@/lib/redux/store";
import { taskEditorInstanceId, workingDocumentInstanceId } from "./definitions/opener-instance-ids";

const SPECS = {
  openAgentAdminFindUsagesWindow: { overlayId: "agentAdminFindUsagesWindow" },
  openAgentContentWindow: { overlayId: "agentAdvancedEditorWindow" },
  openAgentConvertSystemWindow: { overlayId: "agentConvertSystemWindow" },
  openAgentCreateAppWindow: { overlayId: "agentCreateAppWindow" },
  openAgentDataStorageWindow: { overlayId: "agentDataStorageWindow" },
  openAgentFindUsagesWindow: { overlayId: "agentFindUsagesWindow" },
  openAgentImportWindow: { overlayId: "agentImportWindow" },
  openAgentInterfaceVariationsWindow: { overlayId: "agentInterfaceVariationsWindow" },
  openAgentMemoryWindow: { overlayId: "agentMemoryWindow" },
  openAgentOptimizerWindow: { overlayId: "agentOptimizerWindow" },
  openAgentRunHistoryWindow: { overlayId: "agentRunHistoryWindow" },
  openAgentRunWindow: { overlayId: "agentRunWindow", instanceId: "mint" },
  openAgentSettingsWindow: { overlayId: "agentSettingsWindow" },
  openAgentShortcutQuickCreateWindow: { overlayId: "agentAdminShortcutWindow" },
  openAiWatchWindow: { overlayId: "aiWatchWindow" },
  openAuthGateDialog: { overlayId: "authGate" },
  openChatDebugWindow: { overlayId: "chatDebugWindow" },
  openDiffViewerWindow: { overlayId: "diffViewerWindow", instanceId: "mint" },
  openFullScreenMarkdownEditor: { overlayId: "fullScreenEditor", instanceId: "mint" },
  openGmailComposeWindow: { overlayId: "gmailComposeWindow" },
  openImageViewer: { overlayId: "imageViewer" },
  openLiveIntegrationsWindow: { overlayId: "liveIntegrationsWindow" },
  openLiveRunWindow: { overlayId: "liveRunWindow", instanceId: "mint" },
  openMandateWindow: { overlayId: "mandateWindow" },
  openNotesWindow: { overlayId: "notesWindow", instanceId: "mint" },
  openPickListManagerWindow: { overlayId: "pickListManagerWindow" },
  openPromptPreviewWindow: { overlayId: "promptPreviewWindow" },
  openRunControlsWindow: { overlayId: "runControlsWindow" },
  openSaveTemplateDialog: { overlayId: "saveTemplateDialog" },
  openScraperWindow: { overlayId: "scraperWindow" },
  openShortcutEditorWindow: { overlayId: "shortcutEditorWindow" },
  openSurfaceContextInspector: { overlayId: "surfaceContextInspector" },
  openSurfaceContextWindow: { overlayId: "surfaceContextWindow" },
  openSystemInstructionWindow: { overlayId: "systemInstructionWindow" },
  openTaskEditorWindow: { overlayId: "taskEditorWindow", instanceId: (opts) => opts.instanceId ?? taskEditorInstanceId(opts.taskId) },
  openTopicalMapWindow: { overlayId: "topicalMapWindow" },
  openWorkingDocumentWindow: { overlayId: "workingDocumentWindow", instanceId: (opts) => workingDocumentInstanceId(opts.conversationId) },
} as const satisfies LazyChatWindowOpenerSpecs<
  | "openAgentAdminFindUsagesWindow"
  | "openAgentContentWindow"
  | "openAgentConvertSystemWindow"
  | "openAgentCreateAppWindow"
  | "openAgentDataStorageWindow"
  | "openAgentFindUsagesWindow"
  | "openAgentImportWindow"
  | "openAgentInterfaceVariationsWindow"
  | "openAgentMemoryWindow"
  | "openAgentOptimizerWindow"
  | "openAgentRunHistoryWindow"
  | "openAgentRunWindow"
  | "openAgentSettingsWindow"
  | "openAgentShortcutQuickCreateWindow"
  | "openAiWatchWindow"
  | "openAuthGateDialog"
  | "openChatDebugWindow"
  | "openDiffViewerWindow"
  | "openFullScreenMarkdownEditor"
  | "openGmailComposeWindow"
  | "openImageViewer"
  | "openLiveIntegrationsWindow"
  | "openLiveRunWindow"
  | "openMandateWindow"
  | "openNotesWindow"
  | "openPickListManagerWindow"
  | "openPromptPreviewWindow"
  | "openRunControlsWindow"
  | "openSaveTemplateDialog"
  | "openScraperWindow"
  | "openShortcutEditorWindow"
  | "openSurfaceContextInspector"
  | "openSurfaceContextWindow"
  | "openSystemInstructionWindow"
  | "openTaskEditorWindow"
  | "openTopicalMapWindow"
  | "openWorkingDocumentWindow"
>;

export type LazyChatOpenerName = keyof typeof SPECS;

/** Every lazy chat opener for this store; the set loads once, on the first open. */
export function createLazyChatWindowOpeners(store: AppStore) {
  return lazyChatWindowOpeners<LazyChatOpenerName>(SPECS, () =>
    import("./chat-window-openers").then((m) => m.createChatWindowOpeners(store)),
  );
}
