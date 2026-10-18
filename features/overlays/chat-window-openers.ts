"use client";

// THE lazy chat opener set (one chunk, loaded by the first chat-triggered open — never at boot):
// every host window opener chat calls, as plain functions of the store. Specs + loader:
// chat-window-opener-specs.ts. Each opener module keeps its hooks/controllers for app callers.

import type { ChatWindowOpeners } from "@ai-matrx/chat/host";
import type { AppStore } from "@/lib/redux/store";
import type { LazyChatOpenerName } from "./chat-window-opener-specs";
import { createAgentAdminFindUsagesWindowOpener } from "./definitions/agentAdminFindUsagesWindow.overlay";
import { createAgentShortcutQuickCreateWindowOpener } from "./definitions/agentAdminShortcutWindow.overlay";
import { createAgentContentWindowOpener } from "./definitions/agentAdvancedEditorWindow.overlay";
import { createAgentConvertSystemWindowOpener } from "./definitions/agentConvertSystemWindow.overlay";
import { createAgentCreateAppWindowOpener } from "./definitions/agentCreateAppWindow.overlay";
import { createAgentDataStorageWindowOpener } from "./definitions/agentDataStorageWindow.overlay";
import { createAgentFindUsagesWindowOpener } from "./definitions/agentFindUsagesWindow.overlay";
import { createAgentImportWindowOpener } from "./definitions/agentImportWindow.overlay";
import { createAgentInterfaceVariationsWindowOpener } from "./definitions/agentInterfaceVariationsWindow.overlay";
import { createAgentMemoryWindowOpener } from "./definitions/agentMemoryWindow.overlay";
import { createAgentOptimizerWindowOpener } from "./definitions/agentOptimizerWindow.overlay";
import { createAgentRunHistoryWindowOpener } from "./definitions/agentRunHistoryWindow.overlay";
import { createAgentRunWindowOpener } from "./definitions/agentRunWindow.overlay";
import { createAgentSettingsWindowOpener } from "./definitions/agentSettingsWindow.overlay";
import { createWatchAiRunOpener } from "./definitions/aiWatchWindow.overlay";
import { createAuthGateDialogOpener } from "./definitions/authGate.overlay";
import { createChatDebugWindowOpener } from "./definitions/chatDebugWindow.overlay";
import { createDiffViewerWindowOpener } from "./definitions/diffViewerWindow.overlay";
import { createFullScreenMarkdownEditorBridgeOpener } from "./definitions/fullScreenEditor.overlay";
import { createGmailComposeWindowOpener } from "./definitions/gmailComposeWindow.overlay";
import { createLiveIntegrationsWindowOpener } from "./definitions/liveIntegrationsWindow.overlay";
import { createLiveRunWindowOpener } from "./definitions/liveRunWindow.overlay";
import { createMandateWindowOpener } from "./definitions/mandateWindow.overlay";
import { createNotesWindowOpener } from "./definitions/notesWindow.overlay";
import { createPickListManagerWindowOpener } from "./definitions/pickListManagerWindow.overlay";
import { createPromptPreviewWindowOpener } from "./definitions/promptPreviewWindow.overlay";
import { createRunControlsWindowOpener } from "./definitions/runControlsWindow.overlay";
import { createSaveTemplateDialogOpener } from "./definitions/saveTemplateDialog.overlay";
import { createScraperWindowOpener } from "./definitions/scraperWindow.overlay";
import { createShortcutEditorWindowOpener } from "./definitions/shortcutEditorWindow.overlay";
import { createSurfaceContextInspectorOpener } from "./definitions/surfaceContextInspector.overlay";
import { createSurfaceContextWindowOpener } from "./definitions/surfaceContextWindow.overlay";
import { createSystemInstructionWindowOpener } from "./definitions/systemInstructionWindow.overlay";
import { createTaskEditorWindowOpener } from "./definitions/taskEditorWindow.overlay";
import { createTopicalMapWindowOpener } from "./definitions/topicalMapWindow.overlay";
import { createWorkingDocumentWindowOpener } from "./definitions/workingDocumentWindow.overlay";
import { openImageViewer } from "./definitions/imageViewer.overlay";

export function createChatWindowOpeners(store: AppStore): Pick<ChatWindowOpeners, LazyChatOpenerName> {
  return {
    openAgentAdminFindUsagesWindow: createAgentAdminFindUsagesWindowOpener(store),
    openAgentContentWindow: createAgentContentWindowOpener(store),
    openAgentConvertSystemWindow: createAgentConvertSystemWindowOpener(store),
    openAgentCreateAppWindow: createAgentCreateAppWindowOpener(store),
    openAgentDataStorageWindow: createAgentDataStorageWindowOpener(store),
    openAgentFindUsagesWindow: createAgentFindUsagesWindowOpener(store),
    openAgentImportWindow: createAgentImportWindowOpener(store),
    openAgentInterfaceVariationsWindow: createAgentInterfaceVariationsWindowOpener(store),
    openAgentMemoryWindow: createAgentMemoryWindowOpener(store),
    openAgentOptimizerWindow: createAgentOptimizerWindowOpener(store),
    openAgentRunHistoryWindow: createAgentRunHistoryWindowOpener(store),
    openAgentRunWindow: createAgentRunWindowOpener(store),
    openAgentSettingsWindow: createAgentSettingsWindowOpener(store),
    openAgentShortcutQuickCreateWindow: createAgentShortcutQuickCreateWindowOpener(store),
    openAiWatchWindow: createWatchAiRunOpener(store),
    openAuthGateDialog: createAuthGateDialogOpener(store),
    openChatDebugWindow: createChatDebugWindowOpener(store),
    openDiffViewerWindow: createDiffViewerWindowOpener(store),
    openFullScreenMarkdownEditor: createFullScreenMarkdownEditorBridgeOpener(store),
    openGmailComposeWindow: createGmailComposeWindowOpener(store),
    openLiveIntegrationsWindow: createLiveIntegrationsWindowOpener(store),
    openLiveRunWindow: createLiveRunWindowOpener(store),
    openMandateWindow: createMandateWindowOpener(store),
    openNotesWindow: createNotesWindowOpener(store),
    openPickListManagerWindow: createPickListManagerWindowOpener(store),
    openPromptPreviewWindow: createPromptPreviewWindowOpener(store),
    openRunControlsWindow: createRunControlsWindowOpener(store),
    openSaveTemplateDialog: createSaveTemplateDialogOpener(store),
    openScraperWindow: createScraperWindowOpener(store),
    openShortcutEditorWindow: createShortcutEditorWindowOpener(store),
    openSurfaceContextInspector: createSurfaceContextInspectorOpener(store),
    openSurfaceContextWindow: createSurfaceContextWindowOpener(store),
    openSystemInstructionWindow: createSystemInstructionWindowOpener(store),
    openTaskEditorWindow: createTaskEditorWindowOpener(store),
    openTopicalMapWindow: createTopicalMapWindowOpener(store),
    openWorkingDocumentWindow: createWorkingDocumentWindowOpener(store),
    openImageViewer: (opts) => openImageViewer(store.dispatch, opts),
  };
}
