"use client";
import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  closeOverlay,
  selectIsOverlayOpen,
  selectOverlayData,
  selectOpenInstances,
} from "@/lib/redux/slices/overlaySlice";
import {
  closePromptModal,
  selectIsPromptModalOpen,
  selectPromptModalConfig,
  selectPromptModalRunId,
  selectPromptModalTaskId,
  closeCompactModal,
  selectIsCompactModalOpen,
  selectCompactModalConfig,
  selectCompactModalRunId,
  selectCompactModalTaskId,
  closeInlineOverlay,
  selectIsInlineOverlayOpen,
  selectInlineOverlayData,
  selectInlineOverlayRunId,
  closeSidebarResult,
  selectIsSidebarResultOpen,
  selectSidebarResultConfig,
  selectSidebarResultRunId,
  selectSidebarPosition,
  selectSidebarSize,
  selectSidebarTaskId,
  closeFlexiblePanel,
  selectIsFlexiblePanelOpen,
  selectFlexiblePanelConfig,
  selectFlexiblePanelRunId,
  selectFlexiblePanelPosition,
  selectFlexiblePanelTaskId,
  selectToastQueue,
  removeToast,
} from "@/lib/redux/slices/promptRunnerSlice";
import { selectPrimaryResponseTextByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { destroyInstance } from "@/features/agents/redux/execution-system/conversations/conversations.slice";
import dynamic from "next/dynamic";
import type { ResourceType } from "@/utils/permissions";
import { updateOverlayData } from "@/lib/redux/slices/overlayDataSlice";
import { Suspense } from "react";
import { WindowPersistenceManager } from "@/features/window-panels/WindowPersistenceManager";

// ============================================================================
// DYNAMIC IMPORTS — all lazy, no SSR
// ============================================================================

const FullscreenMarkdownEditor = dynamic(
  () =>
    import("@/components/mardown-display/markdown-classification/FullscreenMarkdownEditor"),
  { ssr: false },
);

const FullscreenSocketAccordion = dynamic(
  () => import("@/components/socket/response/FullscreenSocketAccordion"),
  { ssr: false },
);

const FullscreenBrokerState = dynamic(
  () => import("@/features/applet/runner/response/FullscreenBrokerState"),
  { ssr: false },
);

// QuickNotesSheet uses Redux — no provider wrapper needed
const QuickNotesSheet = dynamic(
  () =>
    import("@/features/notes/actions/QuickNotesSheet").then((mod) => ({
      default: mod.QuickNotesSheet,
    })),
  { ssr: false },
);

const QuickTasksSheet = dynamic(
  () =>
    import("@/features/tasks/components/QuickTasksSheet").then((mod) => ({
      default: mod.QuickTasksSheet,
    })),
  { ssr: false },
);

const QuickChatSheet = dynamic(
  () =>
    import("@/features/quick-actions/components/QuickChatSheet").then(
      (mod) => ({ default: mod.QuickChatSheet }),
    ),
  { ssr: false },
);

const QuickDataSheet = dynamic(
  () =>
    import("@/features/quick-actions/components/QuickDataSheet").then(
      (mod) => ({ default: mod.QuickDataSheet }),
    ),
  { ssr: false },
);

const QuickFilesSheet = dynamic(
  () =>
    import("@/features/quick-actions/components/QuickFilesSheet").then(
      (mod) => ({ default: mod.QuickFilesSheet }),
    ),
  { ssr: false },
);

const UtilitiesOverlay = dynamic(
  () =>
    import("@/features/quick-actions/components/UtilitiesOverlay").then(
      (mod) => ({ default: mod.UtilitiesOverlay }),
    ),
  { ssr: false },
);

const QuickAIResultsSheet = dynamic(
  () =>
    import("@/features/prompts/components/results-display/QuickAIResultsSheet").then(
      (mod) => ({ default: mod.QuickAIResultsSheet }),
    ),
  { ssr: false },
);

const FloatingSheet = dynamic(
  () => import("@/components/official/FloatingSheet"),
  { ssr: false },
);

const FullScreenMarkdownEditorChat = dynamic(
  () =>
    import("@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor"),
  { ssr: false },
);

const HtmlPreviewBridge = dynamic(
  () =>
    import("@/features/cx-conversation/components/HtmlPreviewBridge").then(
      (m) => ({ default: m.HtmlPreviewBridge }),
    ),
  { ssr: false },
);

const VSCodePreferencesModal = dynamic(
  () =>
    import("@/components/user-preferences/VSCodePreferencesModal").then(
      (m) => ({ default: m.VSCodePreferencesModal }),
    ),
  { ssr: false },
);

const AnnouncementsViewer = dynamic(
  () =>
    import("@/components/layout/AnnouncementsViewer").then((m) => ({
      default: m.AnnouncementsViewer,
    })),
  { ssr: false },
);

const EmailInputDialog = dynamic(
  () => import("@/components/dialogs/EmailInputDialog"),
  { ssr: false },
);

const AuthGateDialog = dynamic(
  () =>
    import("@/components/dialogs/AuthGateDialog").then((m) => ({
      default: m.AuthGateDialog,
    })),
  { ssr: false },
);

// TODO: Broken after agents refactor.
const ContentHistoryViewer = dynamic(
  () =>
    import("@/features/agents/components/TO-BE-ORGANIZED/ContentHistoryViewer").then(
      (m) => ({
        default: m.ContentHistoryViewer,
      }),
    ),
  { ssr: false },
);

const FeedbackWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/FeedbackWindow").then((m) => ({
      default: m.FeedbackWindow,
    })),
  { ssr: false },
);

const ImageViewerWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/image/ImageViewerWindow").then(
      (m) => ({
        default: m.ImageViewerWindow,
      }),
    ),
  { ssr: false },
);

const FilePreviewWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/files/FilePreviewWindow").then(
      (m) => ({
        default: m.FilePreviewWindow,
      }),
    ),
  { ssr: false },
);

const FileUploadWindow = dynamic(
  () => import("@/features/window-panels/windows/files/FileUploadWindow"),
  { ssr: false },
);

const ShareModal = dynamic(
  () =>
    import("@/features/sharing/components/ShareModal").then((m) => ({
      default: m.ShareModal,
    })),
  { ssr: false },
);

const UndoHistoryOverlay = dynamic(
  () =>
    import("@/features/agents/components/undo-history/UndoHistoryOverlay").then(
      (m) => ({ default: m.UndoHistoryOverlay }),
    ),
  { ssr: false },
);

const StreamDebugFloating = dynamic(
  () =>
    import("@/features/agents/components/debug/StreamDebugFloating").then(
      (m) => ({ default: m.StreamDebugFloating }),
    ),
  { ssr: false },
);

const StreamDebugHistoryWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/admin/StreamDebugHistoryWindow"),
  { ssr: false },
);

const PromptRunnerModal = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptRunnerModal").then(
      (mod) => ({ default: mod.PromptRunnerModal }),
    ),
  { ssr: false },
);

const PromptCompactModal = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptCompactModal"),
  { ssr: false },
);

const PromptInlineOverlay = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptInlineOverlay"),
  { ssr: false },
);

const PromptSidebarRunner = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptSidebarRunner"),
  { ssr: false },
);

const PromptFlexiblePanel = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptFlexiblePanel"),
  { ssr: false },
);

const PromptToast = dynamic(
  () => import("@/features/prompts/components/results-display/PromptToast"),
  { ssr: false },
);

const PreExecutionInputModalContainer = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PreExecutionInputModalContainer").then(
      (mod) => ({ default: mod.PreExecutionInputModalContainer }),
    ),
  { ssr: false },
);

const AgentFullModal = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentFullModal").then(
      (mod) => ({ default: mod.AgentFullModal }),
    ),
  { ssr: false },
);

const AgentCompactModal = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentCompactModal").then(
      (mod) => ({ default: mod.AgentCompactModal }),
    ),
  { ssr: false },
);

const AgentChatBubble = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentChatBubble").then(
      (mod) => ({ default: mod.AgentChatBubble }),
    ),
  { ssr: false },
);

const AgentInlineOverlay = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentInlineOverlay").then(
      (mod) => ({ default: mod.AgentInlineOverlay }),
    ),
  { ssr: false },
);

const AgentSidebarOverlay = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentSidebarOverlay").then(
      (mod) => ({ default: mod.AgentSidebarOverlay }),
    ),
  { ssr: false },
);

const AgentFlexiblePanel = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentFlexiblePanel").then(
      (mod) => ({ default: mod.AgentFlexiblePanel }),
    ),
  { ssr: false },
);

const AgentPanelOverlay = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentPanelOverlay").then(
      (mod) => ({ default: mod.AgentPanelOverlay }),
    ),
  { ssr: false },
);

const AgentToastOverlay = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentToastOverlay").then(
      (mod) => ({ default: mod.AgentToastOverlay }),
    ),
  { ssr: false },
);

const AgentFloatingChat = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/AgentFloatingChat").then(
      (mod) => ({ default: mod.AgentFloatingChat }),
    ),
  { ssr: false },
);

const ChatCollapsible = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/ChatCollapsible").then(
      (mod) => ({ default: mod.ChatCollapsible }),
    ),
  { ssr: false },
);

const AgentChatAssistant = dynamic(
  () =>
    import("@/features/agents/components/agent-widgets/chat-assistant/AgentChatAssistant").then(
      (mod) => ({ default: mod.AgentChatAssistant }),
    ),
  { ssr: false },
);

const StateViewerOverlay = dynamic(
  () => import("@/components/admin/state-analyzer/StateViewerOverlay"),
  { ssr: false },
);

const JsonTruncatorDialog = dynamic(
  () =>
    import("@/components/official-candidate/json-truncator/JsonTruncatorDialog"),
  { ssr: false },
);

const StateViewerWindow = dynamic(
  () => import("@/components/admin/state-analyzer/StateViewerWindow"),
  { ssr: false },
);

const MarkdownEditorWindow = dynamic(
  () => import("@/features/window-panels/windows/MarkdownEditorWindow"),
  { ssr: false },
);

const UserPreferencesWindow = dynamic(
  () => import("@/features/window-panels/windows/UserPreferencesWindow"),
  { ssr: false },
);

const QuickTasksWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/context-scopes/QuickTasksWindow"),
  { ssr: false },
);

const QuickFiles = dynamic(
  () => import("@/features/window-panels/windows/files/QuickFilesWindow"),
  { ssr: false },
);

const QuickDataWindow = dynamic(
  () => import("@/features/window-panels/windows/QuickDataWindow"),
  { ssr: false },
);

const EmailDialogWindow = dynamic(
  () => import("@/features/window-panels/windows/EmailDialogWindow"),
  { ssr: false },
);

const ShareModalWindow = dynamic(
  () => import("@/features/window-panels/windows/ShareModalWindow"),
  { ssr: false },
);

const ScraperWindow = dynamic(
  () => import("@/features/window-panels/windows/ScraperWindow"),
  { ssr: false },
);

const NotesWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/notes/NotesWindow").then((m) => ({
      default: m.NotesWindow,
    })),
  { ssr: false },
);

const NotesBetaWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/notes/NotesBetaWindow").then(
      (m) => ({
        default: m.NotesBetaWindow,
      }),
    ),
  { ssr: false },
);

const QuickNoteSaveWindow = dynamic(
  () => import("@/features/window-panels/windows/notes/QuickNoteSaveWindow"),
  { ssr: false },
);

const QuickNoteSaveOverlay = dynamic(
  () =>
    import("@/features/notes/actions/quick-save/QuickNoteSaveOverlay").then(
      (m) => ({ default: m.QuickNoteSaveOverlay }),
    ),
  { ssr: false },
);

const ContentEditorWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/content-editors/ContentEditorWindow").then(
      (m) => ({ default: m.ContentEditorWindow }),
    ),
  { ssr: false },
);

const ContentEditorListWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/content-editors/ContentEditorListWindow").then(
      (m) => ({ default: m.ContentEditorListWindow }),
    ),
  { ssr: false },
);

const CodeEditorWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/code/CodeEditorWindow").then(
      (m) => ({ default: m.CodeEditorWindow }),
    ),
  { ssr: false },
);

const CodeFileManagerWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/code/CodeFileManagerWindow").then(
      (m) => ({ default: m.CodeFileManagerWindow }),
    ),
  { ssr: false },
);

const QuickSaveCodeDialog = dynamic(
  () =>
    import("@/features/code-files/actions/QuickSaveCodeDialog").then((m) => ({
      default: m.QuickSaveCodeDialog,
    })),
  { ssr: false },
);

const SmartCodeEditorWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/smart-code-editor/SmartCodeEditorWindow").then(
      (m) => ({ default: m.SmartCodeEditorWindow }),
    ),
  { ssr: false },
);

const MultiFileSmartCodeEditorWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/multi-file-smart-code-editor/MultiFileSmartCodeEditorWindow").then(
      (m) => ({ default: m.MultiFileSmartCodeEditorWindow }),
    ),
  { ssr: false },
);

const ContentEditorWorkspaceWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/content-editors/ContentEditorWorkspaceWindow").then(
      (m) => ({ default: m.ContentEditorWorkspaceWindow }),
    ),
  { ssr: false },
);

const ContextSwitcherWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/context-scopes/ContextSwitcherWindow").then(
      (m) => ({ default: m.ContextSwitcherWindow }),
    ),
  { ssr: false },
);

const PdfExtractorWindow = dynamic(
  () => import("@/features/window-panels/windows/PdfExtractorWindow"),
  { ssr: false },
);

const CanvasViewerWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/CanvasViewerWindow").then((m) => ({
      default: m.CanvasViewerWindow,
    })),
  { ssr: false },
);

const NewsWindow = dynamic(
  () => import("@/features/window-panels/windows/NewsWindow"),
  { ssr: false },
);

const BrowserFrameWindow = dynamic(
  () => import("@/features/window-panels/windows/iframe/BrowserFrameWindow"),
  { ssr: false },
);

const BrowserWorkbenchWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/iframe/BrowserWorkbenchWindow"),
  { ssr: false },
);

const GalleryWindow = dynamic(
  () => import("@/features/window-panels/windows/image/GalleryWindow"),
  { ssr: false },
);

const ListManagerWindow = dynamic(
  () => import("@/features/window-panels/windows/ListManagerWindow"),
  { ssr: false },
);

const AiVoiceWindow = dynamic(
  () => import("@/features/window-panels/windows/voice/AiVoiceWindow"),
  { ssr: false },
);

const AgentGateWindow = dynamic(
  () => import("@/features/window-panels/windows/agents/AgentGateWindow"),
  { ssr: false },
);

const HierarchyCreationWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/context-scopes/HierarchyCreationWindow"),
  { ssr: false },
);

const AgentSettingsWindow = dynamic(
  () => import("@/features/window-panels/windows/agents/AgentSettingsWindow"),
  { ssr: false },
);

const AgentRunHistoryWindow = dynamic(
  () => import("@/features/window-panels/windows/agents/AgentRunHistoryWindow"),
  { ssr: false },
);

const AgentRunWindow = dynamic(
  () => import("@/features/window-panels/windows/agents/AgentRunWindow"),
  { ssr: false },
);

const AgentImportWindow = dynamic(
  () => import("@/features/agents/import/AgentImportWindow"),
  { ssr: false },
);

const AgentContentWindow = dynamic(
  () => import("@/features/window-panels/windows/agents/AgentContentWindow"),
  { ssr: false },
);

const AgentContentSidebarWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/agents/AgentContentSidebarWindow"),
  { ssr: false },
);

const ExecutionInspectorWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/admin/ExecutionInspectorWindow"),
  { ssr: false },
);

const InstanceUIStateWindow = dynamic(
  () => import("@/features/window-panels/windows/admin/InstanceUIStateWindow"),
  { ssr: false },
);

const AgentDebugWindow = dynamic(
  () => import("@/features/window-panels/windows/agents/AgentDebugWindow"),
  { ssr: false },
);

const ChatDebugWindow = dynamic(
  () => import("@/features/window-panels/windows/admin/ChatDebugWindow"),
  { ssr: false },
);

const AgentAssistantMarkdownDebugWindow = dynamic(
  () =>
    import("@/features/window-panels/windows/agents/AgentAssistantMarkdownDebugWindow"),
  { ssr: false },
);

// ============================================================================
// OVERLAY CONTROLLER
// ============================================================================

export const OverlayController: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isMounted, setIsMounted] = useState(false);

  // ── Singleton overlay selectors (never instanced) ────────────────────────
  const isMarkdownEditorOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "markdownEditor"),
  );
  const markdownEditorData = useAppSelector((s) =>
    selectOverlayData(s, "markdownEditor"),
  );
  const isSocketAccordionOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "socketAccordion"),
  );
  const socketAccordionData = useAppSelector((s) =>
    selectOverlayData(s, "socketAccordion"),
  );
  const isBrokerStateOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "brokerState"),
  );
  const isQuickNotesOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickNotes"),
  );
  const isQuickTasksOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickTasks"),
  );
  const isQuickChatOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickChat"),
  );
  const isQuickDataOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickData"),
  );
  const isQuickFilesOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickFiles"),
  );
  const isQuickUtilitiesOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickUtilities"),
  );
  const isQuickAIResultsOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickAIResults"),
  );
  const isPreferencesOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "userPreferences"),
  );
  const preferencesData = useAppSelector((s) =>
    selectOverlayData(s, "userPreferences"),
  );
  const isAnnouncementsOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "announcements"),
  );
  const isAuthGateOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "authGate"),
  );
  const authGateData = useAppSelector((s) => selectOverlayData(s, "authGate"));
  const isFeedbackDialogOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "feedbackDialog"),
  );
  const isUndoHistoryOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "undoHistory"),
  );
  const undoHistoryData = useAppSelector((s) =>
    selectOverlayData(s, "undoHistory"),
  );
  const isStreamDebugOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "streamDebug"),
  );
  const streamDebugData = useAppSelector((s) =>
    selectOverlayData(s, "streamDebug"),
  );
  const isStreamDebugHistoryWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "streamDebugHistoryWindow"),
  );
  const streamDebugHistoryData = useAppSelector((s) =>
    selectOverlayData(s, "streamDebugHistoryWindow"),
  );
  const isJsonTruncatorOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "jsonTruncator"),
  );
  const jsonTruncatorData = useAppSelector((s) =>
    selectOverlayData(s, "jsonTruncator"),
  );
  const isAdminStateAnalyzerOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "adminStateAnalyzer"),
  );

  // ── Window Instances ────────────────────────
  const isAdminStateAnalyzerWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "adminStateAnalyzerWindow"),
  );

  const isMarkdownEditorWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "markdownEditorWindow"),
  );
  const markdownEditorWindowData = useAppSelector((s) =>
    selectOverlayData(s, "markdownEditorWindow"),
  );

  const isUserPreferencesWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "userPreferencesWindow"),
  );
  const userPreferencesWindowData = useAppSelector((s) =>
    selectOverlayData(s, "userPreferencesWindow"),
  );

  const isQuickTasksWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickTasksWindow"),
  );
  const isQuickDataWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickDataWindow"),
  );
  const isQuickFilesWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickFilesWindow"),
  );

  const filePreviewInstances = useAppSelector((s) =>
    selectOpenInstances(s, "filePreviewWindow"),
  );
  const isFileUploadWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "fileUploadWindow"),
  );

  const isEmailDialogWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "emailDialogWindow"),
  );
  const emailDialogWindowData = useAppSelector((s) =>
    selectOverlayData(s, "emailDialogWindow"),
  );

  const isShareModalWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "shareModalWindow"),
  );
  const shareModalWindowData = useAppSelector((s) =>
    selectOverlayData(s, "shareModalWindow"),
  );

  const isNotesWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "notesWindow"),
  );
  const notesWindowData = useAppSelector((s) =>
    selectOverlayData(s, "notesWindow"),
  );

  const notesBetaWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "notesBetaWindow"),
  );

  const isQuickNoteSaveWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "quickNoteSaveWindow"),
  );
  const quickNoteSaveWindowData = useAppSelector((s) =>
    selectOverlayData(s, "quickNoteSaveWindow"),
  );

  const saveToNotesFullscreenInstances = useAppSelector((s) =>
    selectOpenInstances(s, "saveToNotesFullscreen"),
  );

  const contentEditorWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "contentEditorWindow"),
  );
  const contentEditorListWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "contentEditorListWindow"),
  );
  const contentEditorWorkspaceWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "contentEditorWorkspaceWindow"),
  );
  const codeFileManagerWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "codeFileManagerWindow"),
  );
  const codeEditorWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "codeEditorWindow"),
  );
  const saveToCodeInstances = useAppSelector((s) =>
    selectOpenInstances(s, "saveToCode"),
  );
  const smartCodeEditorWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "smartCodeEditorWindow"),
  );
  const multiFileSmartCodeEditorWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "multiFileSmartCodeEditorWindow"),
  );

  const isScraperWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "scraperWindow"),
  );

  const isContextSwitcherWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "contextSwitcherWindow"),
  );

  const isPdfExtractorWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "pdfExtractorWindow"),
  );

  const isCanvasViewerWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "canvasViewerWindow"),
  );

  const isNewsWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "newsWindow"),
  );

  const isBrowserFrameWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "browserFrameWindow"),
  );
  const browserFrameWindowData = useAppSelector((s) =>
    selectOverlayData(s, "browserFrameWindow"),
  );

  const isBrowserWorkbenchWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "browserWorkbenchWindow"),
  );
  const browserWorkbenchWindowData = useAppSelector((s) =>
    selectOverlayData(s, "browserWorkbenchWindow"),
  );

  const isGalleryWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "galleryWindow"),
  );

  const isListManagerWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "listManagerWindow"),
  );

  const isAiVoiceWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "aiVoiceWindow"),
  );

  const isHierarchyCreationWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "hierarchyCreationWindow"),
  );

  const hierarchyCreationWindowData = useAppSelector((s) =>
    selectOverlayData(s, "hierarchyCreationWindow"),
  );

  const isAgentSettingsWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentSettingsWindow"),
  );
  const agentSettingsWindowData = useAppSelector((s) =>
    selectOverlayData(s, "agentSettingsWindow"),
  );
  const isAgentRunHistoryWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentRunHistoryWindow"),
  );
  const agentRunHistoryWindowData = useAppSelector((s) =>
    selectOverlayData(s, "agentRunHistoryWindow"),
  );
  const isAgentRunWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentRunWindow"),
  );
  const agentRunWindowData = useAppSelector((s) =>
    selectOverlayData(s, "agentRunWindow"),
  );
  const isAgentImportWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentImportWindow"),
  );

  const isAgentContentWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentContentWindow"),
  );
  const agentContentWindowData = useAppSelector((s) =>
    selectOverlayData(s, "agentContentWindow"),
  );

  const isAgentContentSidebarWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentContentSidebarWindow"),
  );
  const agentContentSidebarWindowData = useAppSelector((s) =>
    selectOverlayData(s, "agentContentSidebarWindow"),
  );

  const isExecutionInspectorWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "executionInspectorWindow"),
  );

  const isInstanceUIStateWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "instanceUIStateWindow"),
  );
  const instanceUIStateWindowData = useAppSelector((s) =>
    selectOverlayData(s, "instanceUIStateWindow"),
  );

  const isAgentDebugWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentDebugWindow"),
  );
  const agentDebugWindowData = useAppSelector((s) =>
    selectOverlayData(s, "agentDebugWindow"),
  );

  const isChatDebugWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "chatDebugWindow"),
  );
  const chatDebugWindowData = useAppSelector((s) =>
    selectOverlayData(s, "chatDebugWindow"),
  );

  const isAgentAssistantMarkdownDebugWindowOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "agentAssistantMarkdownDebugWindow"),
  );

  const agentGateWindowInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentGateWindow"),
  );

  const canvasViewerWindowData = useAppSelector((s) =>
    selectOverlayData(s, "canvasViewerWindow"),
  );

  // ── Instanced overlay selectors — returns all open instances ────────────
  const imageViewerInstances = useAppSelector((s) =>
    selectOpenInstances(s, "imageViewer"),
  );
  const htmlPreviewInstances = useAppSelector((s) =>
    selectOpenInstances(s, "htmlPreview"),
  );
  // Singleton fullScreenEditor — kept mounted once opened so internal state survives close/reopen
  const isFullScreenEditorSingletonOpen = useAppSelector((s) =>
    selectIsOverlayOpen(s, "fullScreenEditor", "default"),
  );
  const fullScreenEditorSingletonData = useAppSelector((s) =>
    selectOverlayData(s, "fullScreenEditor", "default"),
  );
  // Non-default instances — rendered via .map(), persist via onSave → Redux
  const fullScreenEditorInstances = useAppSelector((s) =>
    selectOpenInstances(s, "fullScreenEditor"),
  );
  const saveToNotesInstances = useAppSelector((s) =>
    selectOpenInstances(s, "saveToNotes"),
  );
  const emailDialogInstances = useAppSelector((s) =>
    selectOpenInstances(s, "emailDialog"),
  );
  const contentHistoryInstances = useAppSelector((s) =>
    selectOpenInstances(s, "contentHistory"),
  );
  const shareModalInstances = useAppSelector((s) =>
    selectOpenInstances(s, "shareModal"),
  );

  // ── Prompt Runner selectors ───────────────────────────────────────────────
  const isPromptModalOpen = useAppSelector(selectIsPromptModalOpen);
  const promptModalConfig = useAppSelector(selectPromptModalConfig);
  const promptModalRunId = useAppSelector(selectPromptModalRunId);
  const isCompactModalOpen = useAppSelector(selectIsCompactModalOpen);
  const compactModalConfig = useAppSelector(selectCompactModalConfig);
  const compactModalRunId = useAppSelector(selectCompactModalRunId);
  const compactModalTaskId = useAppSelector(selectCompactModalTaskId);
  const isInlineOverlayOpen = useAppSelector(selectIsInlineOverlayOpen);
  const inlineOverlayData = useAppSelector(selectInlineOverlayData);
  const inlineOverlayRunId = useAppSelector(selectInlineOverlayRunId);
  const isSidebarResultOpen = useAppSelector(selectIsSidebarResultOpen);
  const sidebarResultConfig = useAppSelector(selectSidebarResultConfig);
  const sidebarResultRunId = useAppSelector(selectSidebarResultRunId);
  const sidebarPosition = useAppSelector(selectSidebarPosition);
  const sidebarSize = useAppSelector(selectSidebarSize);
  const isFlexiblePanelOpen = useAppSelector(selectIsFlexiblePanelOpen);
  const flexiblePanelConfig = useAppSelector(selectFlexiblePanelConfig);
  const flexiblePanelRunId = useAppSelector(selectFlexiblePanelRunId);
  const flexiblePanelPosition = useAppSelector(selectFlexiblePanelPosition);
  const toastQueue = useAppSelector(selectToastQueue);

  const promptModalTaskId = useAppSelector(selectPromptModalTaskId);
  const sidebarTaskId = useAppSelector(selectSidebarTaskId);
  const flexiblePanelTaskId = useAppSelector(selectFlexiblePanelTaskId);

  // ── Agent Widget overlay instances ──────────────────────────────────────
  const agentFullModalInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentFullModal"),
  );
  const agentCompactModalInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentCompactModal"),
  );
  const agentChatBubbleInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentChatBubble"),
  );
  const agentInlineOverlayInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentInlineOverlay"),
  );
  const agentSidebarOverlayInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentSidebarOverlay"),
  );
  const agentFlexiblePanelInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentFlexiblePanel"),
  );
  const agentPanelOverlayInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentPanelOverlay"),
  );
  const agentToastOverlayInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentToastOverlay"),
  );
  const agentFloatingChatInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentFloatingChat"),
  );
  const agentChatCollapsibleInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentChatCollapsible"),
  );
  const agentChatAssistantInstances = useAppSelector((s) =>
    selectOpenInstances(s, "agentChatAssistant"),
  );

  const promptModalResponseText = useAppSelector((s) =>
    promptModalTaskId
      ? selectPrimaryResponseTextByTaskId(promptModalTaskId)(s)
      : "",
  );
  const compactModalResponseText = useAppSelector((s) =>
    compactModalTaskId
      ? selectPrimaryResponseTextByTaskId(compactModalTaskId)(s)
      : "",
  );
  const sidebarResponseText = useAppSelector((s) =>
    sidebarTaskId ? selectPrimaryResponseTextByTaskId(sidebarTaskId)(s) : "",
  );
  const flexiblePanelResponseText = useAppSelector((s) =>
    flexiblePanelTaskId
      ? selectPrimaryResponseTextByTaskId(flexiblePanelTaskId)(s)
      : "",
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // ── Singleton close handlers ──────────────────────────────────────────────
  const close = (overlayId: string, instanceId?: string) =>
    dispatch(closeOverlay({ overlayId, instanceId }));

  return (
    <WindowPersistenceManager>
      {/* WindowPersistenceManager wraps all overlays so WindowPanel components
          can access the persistence context via useWindowPersistence(). */}

      {/* ── Singleton overlays (always 0 or 1 instance) ────────────────── */}

      {isMarkdownEditorOpen && (
        <FullscreenMarkdownEditor
          initialMarkdown={markdownEditorData?.initialMarkdown || ""}
          showSampleSelector={markdownEditorData?.showSampleSelector ?? true}
          showConfigSelector={markdownEditorData?.showConfigSelector ?? true}
          onClose={() => close("markdownEditor")}
          isOpen={true}
        />
      )}

      {isSocketAccordionOpen && (
        <FullscreenSocketAccordion
          taskId={socketAccordionData?.taskId}
          onClose={() => close("socketAccordion")}
          isOpen={true}
        />
      )}

      {isBrokerStateOpen && (
        <FullscreenBrokerState
          onClose={() => close("brokerState")}
          isOpen={true}
        />
      )}

      {isQuickNotesOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={() => close("quickNotes")}
          title="Quick Notes"
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
          lockScroll={false}
        >
          <QuickNotesSheet onClose={() => close("quickNotes")} />
        </FloatingSheet>
      )}

      {isQuickTasksOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={() => close("quickTasks")}
          title="Quick Tasks"
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
          lockScroll={false}
        >
          <QuickTasksSheet onClose={() => close("quickTasks")} />
        </FloatingSheet>
      )}

      {isQuickChatOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={() => close("quickChat")}
          title=""
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={false}
          contentClassName="p-0"
          lockScroll={false}
        >
          <QuickChatSheet onClose={() => close("quickChat")} />
        </FloatingSheet>
      )}

      {isQuickDataOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={() => close("quickData")}
          title="Data Tables"
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
          lockScroll={false}
        >
          <QuickDataSheet onClose={() => close("quickData")} />
        </FloatingSheet>
      )}

      {isQuickFilesOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={() => close("quickFiles")}
          title=""
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={false}
          contentClassName="p-0"
          lockScroll={false}
        >
          <QuickFilesSheet onClose={() => close("quickFiles")} />
        </FloatingSheet>
      )}

      {isQuickUtilitiesOpen && (
        <UtilitiesOverlay
          isOpen={true}
          onClose={() => close("quickUtilities")}
        />
      )}

      {isQuickAIResultsOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={() => close("quickAIResults")}
          title=""
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={false}
          contentClassName="p-0"
          lockScroll={false}
        >
          <QuickAIResultsSheet />
        </FloatingSheet>
      )}

      {isPreferencesOpen && (
        <VSCodePreferencesModal
          isOpen={true}
          onClose={() => close("userPreferences")}
          initialTab={preferencesData?.initialTab}
        />
      )}

      {isAnnouncementsOpen && (
        <AnnouncementsViewer
          isOpen={true}
          onClose={() => close("announcements")}
        />
      )}

      {isAuthGateOpen && (
        <AuthGateDialog
          isOpen={true}
          onClose={() => close("authGate")}
          featureName={
            (
              authGateData as {
                featureName?: string;
                featureDescription?: string;
              } | null
            )?.featureName
          }
          featureDescription={
            (
              authGateData as {
                featureName?: string;
                featureDescription?: string;
              } | null
            )?.featureDescription
          }
        />
      )}

      {isFeedbackDialogOpen && <FeedbackWindow />}

      {isUndoHistoryOpen &&
        (undoHistoryData as { agentId?: string } | null)?.agentId && (
          <UndoHistoryOverlay
            isOpen={true}
            onClose={() => close("undoHistory")}
            agentId={(undoHistoryData as { agentId: string }).agentId}
          />
        )}

      {isStreamDebugOpen &&
        (streamDebugData as { conversationId?: string } | null)
          ?.conversationId && (
          <StreamDebugFloating
            conversationId={
              (streamDebugData as { conversationId: string }).conversationId
            }
            onClose={() => close("streamDebug")}
          />
        )}

      <StreamDebugHistoryWindow
        isOpen={isStreamDebugHistoryWindowOpen}
        onClose={() => close("streamDebugHistoryWindow")}
        initialConversationId={
          (streamDebugHistoryData as { initialConversationId?: string } | null)
            ?.initialConversationId ?? null
        }
      />

      {isJsonTruncatorOpen && (
        <JsonTruncatorDialog
          isOpen={true}
          onClose={() => close("jsonTruncator")}
          initialValue={
            (jsonTruncatorData as { initialValue?: string } | null)
              ?.initialValue || "{}"
          }
        />
      )}

      {isAdminStateAnalyzerOpen && (
        <StateViewerOverlay
          isOpen={true}
          onClose={() => close("adminStateAnalyzer")}
        />
      )}

      {isAdminStateAnalyzerWindowOpen && (
        <StateViewerWindow
          isOpen={true}
          onClose={() => close("adminStateAnalyzerWindow")}
        />
      )}

      {isMarkdownEditorWindowOpen && (
        <MarkdownEditorWindow
          isOpen={true}
          onClose={() => close("markdownEditorWindow")}
        />
      )}

      {isUserPreferencesWindowOpen && (
        <UserPreferencesWindow
          isOpen={true}
          onClose={() => close("userPreferencesWindow")}
        />
      )}

      {isQuickTasksWindowOpen && (
        <QuickTasksWindow
          isOpen={true}
          onClose={() => close("quickTasksWindow")}
        />
      )}

      {isQuickDataWindowOpen && (
        <QuickDataWindow
          isOpen={true}
          onClose={() => close("quickDataWindow")}
        />
      )}

      {isQuickFilesWindowOpen && (
        <QuickFiles isOpen={true} onClose={() => close("quickFilesWindow")} />
      )}

      {isScraperWindowOpen && (
        <ScraperWindow isOpen={true} onClose={() => close("scraperWindow")} />
      )}

      {isContextSwitcherWindowOpen && (
        <ContextSwitcherWindow
          isOpen={true}
          onClose={() => close("contextSwitcherWindow")}
        />
      )}

      {isPdfExtractorWindowOpen && (
        <PdfExtractorWindow
          isOpen={true}
          onClose={() => close("pdfExtractorWindow")}
        />
      )}

      {isCanvasViewerWindowOpen && (
        <CanvasViewerWindow
          isOpen={true}
          onClose={() => close("canvasViewerWindow")}
          initialShareToken={canvasViewerWindowData?.shareToken}
        />
      )}

      {isNewsWindowOpen && (
        <NewsWindow isOpen={true} onClose={() => close("newsWindow")} />
      )}

      {isBrowserFrameWindowOpen && (
        <BrowserFrameWindow
          isOpen={true}
          onClose={() => close("browserFrameWindow")}
          initialUrl={
            typeof browserFrameWindowData?.url === "string"
              ? browserFrameWindowData.url
              : null
          }
          initialWindowTitle={
            typeof browserFrameWindowData?.windowTitle === "string"
              ? browserFrameWindowData.windowTitle
              : null
          }
        />
      )}

      {isBrowserWorkbenchWindowOpen && (
        <BrowserWorkbenchWindow
          isOpen={true}
          onClose={() => close("browserWorkbenchWindow")}
          initialBookmarks={browserWorkbenchWindowData?.bookmarks}
          initialTabs={browserWorkbenchWindowData?.tabs}
          initialActiveTabId={
            typeof browserWorkbenchWindowData?.activeTabId === "string"
              ? browserWorkbenchWindowData.activeTabId
              : null
          }
        />
      )}

      {isGalleryWindowOpen && (
        <GalleryWindow isOpen={true} onClose={() => close("galleryWindow")} />
      )}

      {isListManagerWindowOpen && <ListManagerWindow />}

      {isAiVoiceWindowOpen && <AiVoiceWindow />}

      {isHierarchyCreationWindowOpen && (
        <HierarchyCreationWindow
          isOpen={true}
          onClose={() => close("hierarchyCreationWindow")}
          data={hierarchyCreationWindowData}
        />
      )}

      {/* Agent Gate Window — instanced, one per agent pre-execution gate */}
      {agentGateWindowInstances.map(({ instanceId, data }) => {
        const d = data as {
          conversationId: string;
          downstreamOverlayId?: string;
        } | null;
        if (!d?.conversationId) return null;
        return (
          <AgentGateWindow
            key={instanceId}
            instanceId={instanceId}
            conversationId={d.conversationId}
            downstreamOverlayId={d.downstreamOverlayId}
            isOpen={true}
            onClose={() => close("agentGateWindow", instanceId)}
          />
        );
      })}

      {/* File Preview — instanced, multiple can be open simultaneously */}
      {filePreviewInstances.map(({ instanceId, data }) => {
        if (!data) return null;
        return (
          <FilePreviewWindow
            key={instanceId}
            instanceId={instanceId}
            isOpen={true}
            onClose={() => close("filePreviewWindow", instanceId)}
            data={data}
          />
        );
      })}

      {/* File Upload — singleton */}
      {isFileUploadWindowOpen && (
        <FileUploadWindow
          isOpen={true}
          onClose={() => close("fileUploadWindow")}
        />
      )}

      {isEmailDialogWindowOpen && (
        <EmailDialogWindow
          isOpen={true}
          onClose={() => close("emailDialogWindow")}
          {...(emailDialogWindowData as any)}
        />
      )}

      {isShareModalWindowOpen && (
        <ShareModalWindow
          isOpen={true}
          onClose={() => close("shareModalWindow")}
          {...(shareModalWindowData as any)}
        />
      )}

      {isNotesWindowOpen && (
        <NotesWindow
          onClose={() => close("notesWindow")}
          initialTabs={
            (notesWindowData?.openTabs as string[] | undefined) ?? undefined
          }
          initialActiveTab={
            (notesWindowData?.activeTabId as string | null | undefined) ?? null
          }
          singleNoteId={
            (notesWindowData?.singleNoteId as string | null | undefined) ?? null
          }
        />
      )}

      {notesBetaWindowInstances.map(({ instanceId, data }) => (
        <NotesBetaWindow
          key={instanceId}
          windowInstanceId={instanceId}
          title={(data as { title?: string } | null)?.title ?? "Notes Beta"}
          onClose={() => close("notesBetaWindow", instanceId)}
        />
      ))}

      {isQuickNoteSaveWindowOpen && (
        <QuickNoteSaveWindow
          isOpen={true}
          onClose={() => close("quickNoteSaveWindow")}
          initialContent={
            (quickNoteSaveWindowData?.initialContent as string | undefined) ??
            ""
          }
          defaultFolder={
            (quickNoteSaveWindowData?.defaultFolder as string | undefined) ??
            "Scratch"
          }
        />
      )}

      {saveToNotesFullscreenInstances.map(({ instanceId, data }) => {
        const d = data as { content: string; defaultFolder?: string } | null;
        if (!d) return null;
        return (
          <QuickNoteSaveOverlay
            key={instanceId}
            isOpen={true}
            onClose={() => close("saveToNotesFullscreen", instanceId)}
            initialContent={d.content}
            defaultFolder={d.defaultFolder ?? "Scratch"}
            onSaved={() => close("saveToNotesFullscreen", instanceId)}
          />
        );
      })}

      {contentEditorWindowInstances.map(({ instanceId, data }) => (
        <ContentEditorWindow
          key={instanceId}
          windowInstanceId={instanceId}
          callbackGroupId={data?.callbackGroupId ?? null}
          documentId={data?.documentId ?? "default"}
          documentTitle={data?.documentTitle ?? undefined}
          initialValue={data?.initialValue ?? data?.value ?? ""}
          title={data?.title ?? null}
          onClose={() => close("contentEditorWindow", instanceId)}
        />
      ))}

      {contentEditorListWindowInstances.map(({ instanceId, data }) => (
        <ContentEditorListWindow
          key={instanceId}
          windowInstanceId={instanceId}
          callbackGroupId={data?.callbackGroupId ?? null}
          documents={data?.documents ?? []}
          activeDocumentId={data?.activeDocumentId ?? null}
          listTitle={data?.listTitle ?? null}
          title={data?.title ?? null}
          onClose={() => close("contentEditorListWindow", instanceId)}
        />
      ))}

      {contentEditorWorkspaceWindowInstances.map(({ instanceId, data }) => (
        <ContentEditorWorkspaceWindow
          key={instanceId}
          windowInstanceId={instanceId}
          callbackGroupId={data?.callbackGroupId ?? null}
          documents={data?.documents ?? []}
          openDocumentIds={data?.openDocumentIds ?? undefined}
          activeDocumentId={data?.activeDocumentId ?? null}
          listTitle={data?.listTitle ?? null}
          title={data?.title ?? null}
          onClose={() => close("contentEditorWorkspaceWindow", instanceId)}
        />
      ))}

      {codeEditorWindowInstances.map(({ instanceId, data }) => (
        <CodeEditorWindow
          key={instanceId}
          windowInstanceId={instanceId}
          files={data?.files ?? []}
          fileIds={data?.fileIds ?? undefined}
          activeFileId={data?.activeFileId ?? undefined}
          autoFormatOnOpen={data?.autoFormatOnOpen ?? false}
          defaultWordWrap={data?.defaultWordWrap ?? "off"}
          title={data?.title ?? null}
          onClose={() => close("codeEditorWindow", instanceId)}
        />
      ))}

      {codeFileManagerWindowInstances.map(({ instanceId }) => (
        <CodeFileManagerWindow
          key={instanceId}
          windowInstanceId={instanceId}
          onClose={() => close("codeFileManagerWindow", instanceId)}
        />
      ))}

      {/* Save to Code — instanced so multiple save dialogs can be open. */}
      {saveToCodeInstances.map(({ instanceId, data }) => {
        const d = data as {
          content?: string;
          language?: string;
          suggestedName?: string;
          defaultFolderId?: string | null;
        } | null;
        if (!d || typeof d.content !== "string") return null;
        return (
          <QuickSaveCodeDialog
            key={instanceId}
            open={true}
            onOpenChange={(open) => {
              if (!open) close("saveToCode", instanceId);
            }}
            initialContent={d.content}
            initialLanguage={d.language}
            suggestedName={d.suggestedName}
            defaultFolderId={d.defaultFolderId ?? null}
          />
        );
      })}

      {smartCodeEditorWindowInstances.map(({ instanceId, data }) => {
        // The 4-column editor takes an `agents` array rather than a single
        // agentId — each entry carries its own `codeVariableKey` mapping.
        const agents = Array.isArray(data?.agents) ? data.agents : null;
        if (!agents || agents.length === 0) return null;
        return (
          <SmartCodeEditorWindow
            key={instanceId}
            windowInstanceId={instanceId}
            callbackGroupId={data?.callbackGroupId ?? null}
            agents={agents}
            defaultPickerAgentId={data?.defaultPickerAgentId ?? undefined}
            initialCode={data?.initialCode ?? ""}
            language={data?.language ?? "plaintext"}
            files={data?.files ?? undefined}
            initialActiveFilePath={data?.initialActiveFilePath ?? undefined}
            filePath={data?.filePath ?? undefined}
            selection={data?.selection ?? undefined}
            diagnostics={data?.diagnostics ?? undefined}
            workspaceName={data?.workspaceName ?? undefined}
            workspaceFolders={data?.workspaceFolders ?? undefined}
            gitBranch={data?.gitBranch ?? undefined}
            gitStatus={data?.gitStatus ?? undefined}
            agentSkills={data?.agentSkills ?? undefined}
            title={data?.title ?? null}
            onClose={() => close("smartCodeEditorWindow", instanceId)}
          />
        );
      })}

      {multiFileSmartCodeEditorWindowInstances.map(({ instanceId, data }) => {
        if (!data?.agentId || typeof data.agentId !== "string") return null;
        return (
          <MultiFileSmartCodeEditorWindow
            key={instanceId}
            windowInstanceId={instanceId}
            callbackGroupId={data?.callbackGroupId ?? null}
            agentId={data.agentId}
            files={data?.files ?? []}
            initialActiveFile={data?.initialActiveFile ?? null}
            title={data?.title ?? null}
            defaultWordWrap={data?.defaultWordWrap ?? "off"}
            autoFormatOnOpen={data?.autoFormatOnOpen ?? false}
            variables={data?.variables ?? null}
            onClose={() => close("multiFileSmartCodeEditorWindow", instanceId)}
          />
        );
      })}

      {/* ── Instanced overlays — .map() renders each open instance ─────── */}
      {/* Each instance gets a stable key so React correctly reconciles them. */}

      {/* Image Viewer — multiple viewers can be open simultaneously */}
      {imageViewerInstances.map(({ instanceId, data }) => {
        const d = data as {
          images: string[];
          initialIndex?: number;
          alts?: string[];
          title?: string;
        } | null;
        if (!d?.images?.length) return null;
        return (
          <ImageViewerWindow
            key={instanceId}
            instanceId={instanceId}
            isOpen={true}
            onClose={() => close("imageViewer", instanceId)}
            images={d.images}
            initialIndex={d.initialIndex}
            alts={d.alts}
            title={d.title}
          />
        );
      })}

      {/* HTML Preview — can have multiple simultaneous independent instances */}
      {htmlPreviewInstances.map(({ instanceId, data }) => (
        <HtmlPreviewBridge
          key={instanceId}
          content={data?.content ?? ""}
          messageId={data?.messageId}
          conversationId={data?.conversationId}
          onClose={() => close("htmlPreview", instanceId)}
          title={data?.title}
          description={data?.description}
          showSaveButton={data?.showSaveButton}
          isAgentSystem={data?.isAgentSystem}
          onSave={(markdownContent: string) => {
            // Persist the saved content back to overlayDataSlice so this instance
            // restores to the last-saved state if it is reopened in the same session.
            dispatch(
              updateOverlayData({
                overlayId: "htmlPreview",
                instanceId,
                updates: { content: markdownContent },
              }),
            );
            // Fire the caller's optional onSave if one was provided at open-time.
            data?.onSave?.(markdownContent);
          }}
        />
      ))}

      {/*
       * Full Screen Markdown Editor — two rendering strategies:
       *
       * 1. Singleton (instanceId = 'default'):
       *    Rendered unconditionally once it has ever been opened. isOpen is passed
       *    as a controlled prop so the component stays MOUNTED through close/reopen
       *    cycles — all internal useState (cursor position, undo history, etc.)
       *    survives. We never reset initialContent after first mount.
       *
       * 2. Non-default instances (UUID instanceIds):
       *    Rendered via .map() — they mount on open and unmount on close. Content
       *    is persisted through the onSave → overlayDataSlice → initialContent
       *    pipeline, so reopening the same UUID restores the last-saved state.
       */}

      {/*
       * Singleton — stays in React tree once ever opened.
       * ShadCN Dialog still unmounts DialogContent when closed, but onChange
       * syncs every keystroke into overlayDataSlice. When reopened, initialContent
       * comes from Redux (already up-to-date), so the editor restores exactly
       * where the user left off. showSaveButton is always false — auto-persists.
       */}
      {fullScreenEditorSingletonData !== undefined && (
        <FullScreenMarkdownEditorChat
          key="default"
          isOpen={isFullScreenEditorSingletonOpen}
          initialContent={fullScreenEditorSingletonData?.content ?? ""}
          onChange={(newContent: string) => {
            dispatch(
              updateOverlayData({
                overlayId: "fullScreenEditor",
                instanceId: "default",
                updates: { content: newContent },
              }),
            );
          }}
          onCancel={() => close("fullScreenEditor", "default")}
          tabs={fullScreenEditorSingletonData?.tabs}
          initialTab={fullScreenEditorSingletonData?.initialTab}
          analysisData={fullScreenEditorSingletonData?.analysisData}
          messageId={fullScreenEditorSingletonData?.messageId}
          title={fullScreenEditorSingletonData?.title}
          showSaveButton={false}
          showCopyButton={fullScreenEditorSingletonData?.showCopyButton}
        />
      )}

      {/* Non-default instances — mount/unmount per open/close, restored via onSave */}
      {fullScreenEditorInstances
        .filter(({ instanceId }) => instanceId !== "default")
        .map(({ instanceId, data }) => (
          <FullScreenMarkdownEditorChat
            key={instanceId}
            isOpen={true}
            initialContent={data?.content ?? ""}
            onSave={(newContent: string) => {
              dispatch(
                updateOverlayData({
                  overlayId: "fullScreenEditor",
                  instanceId,
                  updates: { content: newContent },
                }),
              );
              dispatch(
                closeOverlay({ overlayId: "fullScreenEditor", instanceId }),
              );
              data?.onSave?.(newContent);
            }}
            onCancel={() => close("fullScreenEditor", instanceId)}
            tabs={data?.tabs}
            initialTab={data?.initialTab}
            analysisData={data?.analysisData}
            messageId={data?.messageId}
            title={data?.title}
            showSaveButton={data?.showSaveButton}
            showCopyButton={data?.showCopyButton}
          />
        ))}

      {/* Save to Notes — renders as a floating Window (default target). */}
      {saveToNotesInstances.map(({ instanceId, data }) => {
        const d = data as { content: string; defaultFolder?: string } | null;
        if (!d) return null;
        return (
          <QuickNoteSaveWindow
            key={instanceId}
            instanceId={instanceId}
            isOpen={true}
            onClose={() => close("saveToNotes", instanceId)}
            initialContent={d.content}
            defaultFolder={d.defaultFolder ?? "Scratch"}
          />
        );
      })}

      {/* Email Dialog — instanced for independent email compositions */}
      {emailDialogInstances.map(({ instanceId, data }) => {
        const d = data as {
          content: string;
          metadata?: Record<string, unknown> | null;
        } | null;
        if (!d) return null;
        return (
          <EmailInputDialog
            key={instanceId}
            isOpen={true}
            onClose={() => close("emailDialog", instanceId)}
            onSubmit={async (email: string) => {
              const response = await fetch("/api/chat/email-response", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email,
                  content: d.content,
                  metadata: {
                    ...(d.metadata ?? {}),
                    timestamp: new Date().toLocaleString(),
                  },
                }),
              });
              const result = (await response.json()) as {
                success?: boolean;
                msg?: string;
              };
              if (!result.success)
                throw new Error(result.msg || "Failed to send email");
              close("emailDialog", instanceId);
            }}
          />
        );
      })}

      {/* Content History — instanced so multiple message histories can be open */}
      {contentHistoryInstances.map(({ instanceId, data }) => {
        const d = data as { sessionId?: string; messageId?: string } | null;
        if (!d?.sessionId || !d?.messageId) return null;
        return (
          <ContentHistoryViewer
            key={instanceId}
            isOpen={true}
            onClose={() => close("contentHistory", instanceId)}
            sessionId={d.sessionId}
            messageId={d.messageId}
          />
        );
      })}

      {/* Share Modal — instanced for independent resource sharing dialogs */}
      {shareModalInstances.map(({ instanceId, data }) => {
        const d = data as {
          resourceType: string;
          resourceId: string;
          resourceName: string;
          isOwner: boolean;
        } | null;
        if (!d) return null;
        return (
          <ShareModal
            key={instanceId}
            isOpen={true}
            onClose={() => close("shareModal", instanceId)}
            resourceType={d.resourceType as ResourceType}
            resourceId={d.resourceId}
            resourceName={d.resourceName}
            isOwner={d.isOwner}
          />
        );
      })}

      {/* ── Prompt Result Displays ──────────────────────────────────────── */}

      <PreExecutionInputModalContainer />

      {isPromptModalOpen && promptModalConfig?.runId && (
        <PromptRunnerModal
          isOpen={true}
          onClose={() =>
            dispatch(
              closePromptModal({ responseText: promptModalResponseText }),
            )
          }
          runId={promptModalConfig.runId}
          title={promptModalConfig.title}
          onExecutionComplete={promptModalConfig.onExecutionComplete}
        />
      )}

      {isCompactModalOpen && compactModalRunId && (
        <PromptCompactModal
          isOpen={true}
          onClose={() =>
            dispatch(
              closeCompactModal({ responseText: compactModalResponseText }),
            )
          }
          runId={compactModalRunId}
        />
      )}

      {isInlineOverlayOpen && inlineOverlayData && (
        <PromptInlineOverlay
          isOpen={true}
          onClose={() => dispatch(closeInlineOverlay())}
          result={inlineOverlayData.result || ""}
          originalText={inlineOverlayData.originalText || ""}
          promptName={inlineOverlayData.promptName || ""}
          runId={inlineOverlayRunId || undefined}
          taskId={inlineOverlayData.taskId || undefined}
          isStreaming={inlineOverlayData.isStreaming}
          onReplace={inlineOverlayData.callbacks?.onReplace}
          onInsertBefore={inlineOverlayData.callbacks?.onInsertBefore}
          onInsertAfter={inlineOverlayData.callbacks?.onInsertAfter}
        />
      )}

      {isSidebarResultOpen &&
        (sidebarResultRunId || sidebarResultConfig?.runId) && (
          <PromptSidebarRunner
            isOpen={true}
            onClose={() =>
              dispatch(
                closeSidebarResult({ responseText: sidebarResponseText }),
              )
            }
            runId={sidebarResultRunId || sidebarResultConfig?.runId || ""}
            position={sidebarPosition}
            size={sidebarSize}
            title={sidebarResultConfig?.title}
          />
        )}

      {isFlexiblePanelOpen &&
        (flexiblePanelRunId || flexiblePanelConfig?.runId) && (
          <PromptFlexiblePanel
            isOpen={true}
            onClose={() =>
              dispatch(
                closeFlexiblePanel({ responseText: flexiblePanelResponseText }),
              )
            }
            runId={flexiblePanelRunId || flexiblePanelConfig?.runId || ""}
            position={flexiblePanelPosition}
            title={flexiblePanelConfig?.title}
          />
        )}

      {/* Toast queue — stacked, not instanced (managed by promptRunnerSlice) */}
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            bottom: `${16 + index * 100}px`,
            right: "16px",
            zIndex: 200 + index,
          }}
        >
          <PromptToast
            toastId={toast.id}
            result={toast.result}
            promptName={toast.promptName || ""}
            promptData={toast.promptData}
            executionConfig={toast.executionConfig}
            runId={toast.runId}
            taskId={toast.taskId}
            isStreaming={toast.isStreaming}
            onDismiss={(id: string) => dispatch(removeToast(id))}
          />
        </div>
      ))}

      {/* ── Agent Execution Widget Overlays ─────────────────────────────── */}

      {agentFullModalInstances.map(({ instanceId }) => (
        <AgentFullModal
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentFullModal", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentCompactModalInstances.map(({ instanceId }) => (
        <AgentCompactModal
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentCompactModal", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentChatBubbleInstances.map(({ instanceId }) => (
        <AgentChatBubble
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentChatBubble", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentInlineOverlayInstances.map(({ instanceId }) => (
        <AgentInlineOverlay
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentInlineOverlay", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentSidebarOverlayInstances.map(({ instanceId }) => (
        <AgentSidebarOverlay
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentSidebarOverlay", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentFlexiblePanelInstances.map(({ instanceId }) => (
        <AgentFlexiblePanel
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentFlexiblePanel", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentPanelOverlayInstances.map(({ instanceId }) => (
        <AgentPanelOverlay
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentPanelOverlay", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentToastOverlayInstances.map(({ instanceId, data }, idx) => (
        <AgentToastOverlay
          key={instanceId}
          conversationId={instanceId}
          index={(data as { index?: number } | null)?.index ?? idx}
          onClose={() => {
            close("agentToastOverlay", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentFloatingChatInstances.map(({ instanceId }) => (
        <AgentFloatingChat
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentFloatingChat", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentChatCollapsibleInstances.map(({ instanceId }) => (
        <ChatCollapsible
          key={instanceId}
          conversationId={instanceId}
          onClose={() => {
            close("agentChatCollapsible", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {agentChatAssistantInstances.map(({ instanceId }, idx) => (
        <AgentChatAssistant
          key={instanceId}
          conversationId={instanceId}
          stackIndex={idx}
          onClose={() => {
            close("agentChatAssistant", instanceId);
            dispatch(destroyInstance(instanceId));
          }}
        />
      ))}

      {isAgentSettingsWindowOpen && (
        <AgentSettingsWindow
          isOpen={true}
          onClose={() => close("agentSettingsWindow")}
          initialAgentId={agentSettingsWindowData?.initialAgentId}
        />
      )}

      {isAgentRunHistoryWindowOpen && (
        <AgentRunHistoryWindow
          isOpen={true}
          onClose={() => close("agentRunHistoryWindow")}
          agentId={agentRunHistoryWindowData?.agentId as string | null}
          initialSelectedConversationId={
            agentRunHistoryWindowData?.selectedConversationId as string | null
          }
        />
      )}

      {isAgentRunWindowOpen && (
        <AgentRunWindow
          isOpen={true}
          onClose={() => close("agentRunWindow")}
          initialAgentId={agentRunWindowData?.agentId as string | null}
          initialSelectedConversationId={
            agentRunWindowData?.selectedConversationId as string | null
          }
        />
      )}

      {isAgentImportWindowOpen && (
        <AgentImportWindow
          isOpen={true}
          onClose={() => close("agentImportWindow")}
        />
      )}

      {isAgentContentWindowOpen && (
        <AgentContentWindow
          isOpen={true}
          onClose={() => close("agentContentWindow")}
          {...(agentContentWindowData as any)}
        />
      )}

      {isAgentContentSidebarWindowOpen && (
        <AgentContentSidebarWindow
          isOpen={true}
          onClose={() => close("agentContentSidebarWindow")}
          {...(agentContentSidebarWindowData as any)}
        />
      )}

      {isExecutionInspectorWindowOpen && (
        <ExecutionInspectorWindow
          isOpen={true}
          onClose={() => close("executionInspectorWindow")}
        />
      )}

      {isInstanceUIStateWindowOpen && (
        <InstanceUIStateWindow
          isOpen={true}
          onClose={() => close("instanceUIStateWindow")}
          initialConversationId={
            instanceUIStateWindowData?.selectedConversationId as string | null
          }
        />
      )}

      {isAgentDebugWindowOpen && (
        <AgentDebugWindow
          isOpen={true}
          onClose={() => close("agentDebugWindow")}
          initialAgentId={agentDebugWindowData?.initialAgentId as string | null}
          initialConversationId={
            agentDebugWindowData?.initialConversationId as string | null
          }
        />
      )}

      {isChatDebugWindowOpen && (
        <ChatDebugWindow
          isOpen={true}
          onClose={() => close("chatDebugWindow")}
          sessionId={chatDebugWindowData?.sessionId as string | null}
        />
      )}

      {isAgentAssistantMarkdownDebugWindowOpen && (
        <AgentAssistantMarkdownDebugWindow
          isOpen={true}
          onClose={() => close("agentAssistantMarkdownDebugWindow")}
        />
      )}
    </WindowPersistenceManager>
  );
};

export default OverlayController;
