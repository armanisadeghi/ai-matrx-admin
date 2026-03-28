"use client";
import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  closeOverlay,
  selectIsOverlayOpen,
  selectOverlayData,
} from "@/lib/redux/slices/overlaySlice";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";
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
import dynamic from "next/dynamic";

// Dynamically import the components with ssr: false to prevent them from loading on the server
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

// Quick Action Sheets
// QuickNotesSheet requires NotesProvider — wrap it here so it works in both
// the authenticated layout (which has NotesProvider globally) and the SSR layout (which doesn't).
// NotesProvider is lazy and starts empty, so there's no performance cost until the sheet opens.
const QuickNotesSheet = dynamic(
  () =>
    Promise.all([
      import("@/features/notes/components/QuickNotesSheet"),
      import("@/features/notes/context/NotesContext"),
    ]).then(([sheetMod, ctxMod]) => {
      const Sheet = sheetMod.QuickNotesSheet;
      const Provider = ctxMod.NotesProvider;
      function QuickNotesSheetWithProvider(
        props: React.ComponentProps<typeof Sheet>,
      ) {
        return (
          <Provider>
            <Sheet {...props} />
          </Provider>
        );
      }
      return { default: QuickNotesSheetWithProvider };
    }),
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

// ── New consolidated overlays ────────────────────────────────────────────────

// QuickSaveModal — wraps in NotesProvider so it works outside the notes page
const QuickSaveModalWithProvider = dynamic(
  () =>
    Promise.all([
      import("@/features/notes/components/QuickSaveModal"),
      import("@/features/notes/context/NotesContext"),
    ]).then(([modalMod, ctxMod]) => {
      const Modal = modalMod.QuickSaveModal;
      const Provider = ctxMod.NotesProvider;
      function QuickSaveModalWithNotesProvider(
        props: React.ComponentProps<typeof Modal>,
      ) {
        return (
          <Provider>
            <Modal {...props} />
          </Provider>
        );
      }
      return { default: QuickSaveModalWithNotesProvider };
    }),
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

const ContentHistoryViewer = dynamic(
  () =>
    import("@/features/cx-conversation/ContentHistoryViewer").then((m) => ({
      default: m.ContentHistoryViewer,
    })),
  { ssr: false },
);

const FeedbackDialog = dynamic(
  () => import("@/app/(ssr)/_components/FeedbackDialog"),
  { ssr: false },
);

const ShareModal = dynamic(
  () =>
    import("@/features/sharing/components/ShareModal").then((m) => ({
      default: m.ShareModal,
    })),
  { ssr: false },
);

// Prompt Runner Modal (modal-full)
const PromptRunnerModal = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptRunnerModal").then(
      (mod) => ({ default: mod.PromptRunnerModal }),
    ),
  { ssr: false },
);

// Prompt Compact Modal (modal-compact)
const PromptCompactModal = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptCompactModal"),
  { ssr: false },
);

// Prompt Inline Overlay (inline)
const PromptInlineOverlay = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptInlineOverlay"),
  { ssr: false },
);

// Prompt Sidebar Runner (sidebar)
const PromptSidebarRunner = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptSidebarRunner"),
  { ssr: false },
);

// Prompt Flexible Panel (flexible-panel)
const PromptFlexiblePanel = dynamic(
  () =>
    import("@/features/prompts/components/results-display/PromptFlexiblePanel"),
  { ssr: false },
);

// Prompt Toast (toast)
const PromptToast = dynamic(
  () => import("@/features/prompts/components/toast/PromptToast"),
  { ssr: false },
);

// Pre-Execution Input Modal (NEW)
const PreExecutionInputModalContainer = dynamic(
  () =>
    import("@/features/prompts/components/modals/PreExecutionInputModalContainer").then(
      (mod) => ({ default: mod.PreExecutionInputModalContainer }),
    ),
  { ssr: false },
);

/**
 * OverlayController component renders different overlays based on redux state
 */
export const OverlayController: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isMounted, setIsMounted] = useState(false);

  // Check if each overlay is open
  const isMarkdownEditorOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "markdownEditor"),
  );
  const isSocketAccordionOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "socketAccordion"),
  );
  const isBrokerStateOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "brokerState"),
  );

  // Quick Action overlays
  const isQuickNotesOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickNotes"),
  );
  const isQuickTasksOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickTasks"),
  );
  const isQuickChatOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickChat"),
  );
  const isQuickDataOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickData"),
  );
  const isQuickFilesOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickFiles"),
  );
  const isQuickUtilitiesOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickUtilities"),
  );
  const isQuickAIResultsOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "quickAIResults"),
  );
  const isHtmlPreviewOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "htmlPreview"),
  );
  const htmlPreviewData = useAppSelector((state) =>
    selectOverlayData(state, "htmlPreview"),
  );
  const isFullScreenEditorOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "fullScreenEditor"),
  );
  const fullScreenEditorData = useAppSelector((state) =>
    selectOverlayData(state, "fullScreenEditor"),
  );
  const isPreferencesOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "userPreferences"),
  );
  const preferencesData = useAppSelector((state) =>
    selectOverlayData(state, "userPreferences"),
  );
  const isAnnouncementsOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "announcements"),
  );

  // New consolidated overlay selectors
  const isSaveToNotesOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "saveToNotes"),
  );
  const saveToNotesData = useAppSelector((state) =>
    selectOverlayData(state, "saveToNotes"),
  );
  const isEmailDialogOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "emailDialog"),
  );
  const emailDialogData = useAppSelector((state) =>
    selectOverlayData(state, "emailDialog"),
  );
  const isAuthGateOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "authGate"),
  );
  const authGateData = useAppSelector((state) =>
    selectOverlayData(state, "authGate"),
  );
  const isContentHistoryOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "contentHistory"),
  );
  const contentHistoryData = useAppSelector((state) =>
    selectOverlayData(state, "contentHistory"),
  );
  const isFeedbackDialogOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "feedbackDialog"),
  );
  const isShareModalOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "shareModal"),
  );
  const shareModalData = useAppSelector((state) =>
    selectOverlayData(state, "shareModal"),
  );

  // Prompt Runner Modals
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

  // Get taskIds for saving response text on close
  const promptModalTaskId = useAppSelector(selectPromptModalTaskId);
  const sidebarTaskId = useAppSelector(selectSidebarTaskId);
  const flexiblePanelTaskId = useAppSelector(selectFlexiblePanelTaskId);

  // Get data for each overlay
  const markdownEditorData = useAppSelector((state) =>
    selectOverlayData(state, "markdownEditor"),
  );
  const socketAccordionData = useAppSelector((state) =>
    selectOverlayData(state, "socketAccordion"),
  );

  // Get response texts from Redux (for saving on close)
  const promptModalResponseText = useAppSelector((state) =>
    promptModalTaskId
      ? selectPrimaryResponseTextByTaskId(promptModalTaskId)(state)
      : "",
  );
  const compactModalResponseText = useAppSelector((state) =>
    compactModalTaskId
      ? selectPrimaryResponseTextByTaskId(compactModalTaskId)(state)
      : "",
  );
  const sidebarResponseText = useAppSelector((state) =>
    sidebarTaskId
      ? selectPrimaryResponseTextByTaskId(sidebarTaskId)(state)
      : "",
  );
  const flexiblePanelResponseText = useAppSelector((state) =>
    flexiblePanelTaskId
      ? selectPrimaryResponseTextByTaskId(flexiblePanelTaskId)(state)
      : "",
  );

  // Only render after component has mounted on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything on the server or during hydration
  if (!isMounted) {
    return null;
  }

  // Handlers for closing each overlay
  const handleCloseMarkdownEditor = () => {
    dispatch(closeOverlay({ overlayId: "markdownEditor" }));
  };

  const handleCloseSocketAccordion = () => {
    dispatch(closeOverlay({ overlayId: "socketAccordion" }));
  };

  const handleCloseBrokerState = () => {
    dispatch(closeOverlay({ overlayId: "brokerState" }));
  };

  // Quick Action handlers
  const handleCloseQuickNotes = () => {
    dispatch(closeOverlay({ overlayId: "quickNotes" }));
  };

  const handleCloseQuickTasks = () => {
    dispatch(closeOverlay({ overlayId: "quickTasks" }));
  };

  const handleCloseQuickChat = () => {
    dispatch(closeOverlay({ overlayId: "quickChat" }));
  };

  const handleCloseQuickData = () => {
    dispatch(closeOverlay({ overlayId: "quickData" }));
  };

  const handleCloseQuickFiles = () => {
    dispatch(closeOverlay({ overlayId: "quickFiles" }));
  };

  const handleCloseQuickUtilities = () => {
    dispatch(closeOverlay({ overlayId: "quickUtilities" }));
  };

  const handleCloseQuickAIResults = () => {
    dispatch(closeOverlay({ overlayId: "quickAIResults" }));
  };

  const handleCloseHtmlPreview = () => {
    dispatch(closeOverlay({ overlayId: "htmlPreview" }));
  };

  const handleCloseFullScreenEditor = () => {
    dispatch(closeOverlay({ overlayId: "fullScreenEditor" }));
  };

  const handleClosePreferences = () => {
    dispatch(closeOverlay({ overlayId: "userPreferences" }));
  };

  const handleCloseAnnouncements = () => {
    dispatch(closeOverlay({ overlayId: "announcements" }));
  };

  // New consolidated overlay close handlers
  const handleCloseSaveToNotes = () => {
    dispatch(closeOverlay({ overlayId: "saveToNotes" }));
  };

  const handleCloseEmailDialog = () => {
    dispatch(closeOverlay({ overlayId: "emailDialog" }));
  };

  const handleCloseAuthGate = () => {
    dispatch(closeOverlay({ overlayId: "authGate" }));
  };

  const handleCloseContentHistory = () => {
    dispatch(closeOverlay({ overlayId: "contentHistory" }));
  };

  const handleCloseFeedbackDialog = () => {
    dispatch(closeOverlay({ overlayId: "feedbackDialog" }));
  };

  const handleCloseShareModal = () => {
    dispatch(closeOverlay({ overlayId: "shareModal" }));
  };

  // Prompt Runner handlers
  const handleClosePromptModal = () => {
    // Save response text to sessionStorage before closing
    dispatch(closePromptModal({ responseText: promptModalResponseText }));
  };

  const handleCloseCompactModal = () => {
    // Save response text to sessionStorage before closing
    dispatch(closeCompactModal({ responseText: compactModalResponseText }));
  };

  const handleCloseInlineOverlay = () => {
    dispatch(closeInlineOverlay());
  };

  const handleCloseSidebarResult = () => {
    // Save response text to sessionStorage before closing
    dispatch(closeSidebarResult({ responseText: sidebarResponseText }));
  };

  const handleCloseFlexiblePanel = () => {
    // Save response text to sessionStorage before closing
    dispatch(closeFlexiblePanel({ responseText: flexiblePanelResponseText }));
  };

  const handleDismissToast = (toastId: string) => {
    dispatch(removeToast(toastId));
  };

  return (
    <>
      {/* Markdown Editor Overlay */}
      {isMarkdownEditorOpen && (
        <FullscreenMarkdownEditor
          initialMarkdown={markdownEditorData?.initialMarkdown || ""}
          showSampleSelector={markdownEditorData?.showSampleSelector ?? true}
          showConfigSelector={markdownEditorData?.showConfigSelector ?? true}
          onClose={handleCloseMarkdownEditor}
          isOpen={isMarkdownEditorOpen}
        />
      )}

      {/* Socket Accordion Overlay */}
      {isSocketAccordionOpen && (
        <FullscreenSocketAccordion
          taskId={socketAccordionData?.taskId}
          onClose={handleCloseSocketAccordion}
          isOpen={isSocketAccordionOpen}
        />
      )}

      {/* Broker State Overlay */}
      {isBrokerStateOpen && (
        <FullscreenBrokerState
          onClose={handleCloseBrokerState}
          isOpen={isBrokerStateOpen}
        />
      )}

      {/* Quick Notes Overlay */}
      {isQuickNotesOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={handleCloseQuickNotes}
          title="Quick Notes"
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
          lockScroll={false}
        >
          <QuickNotesSheet onClose={handleCloseQuickNotes} />
        </FloatingSheet>
      )}

      {/* Quick Tasks Overlay */}
      {isQuickTasksOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={handleCloseQuickTasks}
          title="Quick Tasks"
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
          lockScroll={false}
        >
          <QuickTasksSheet onClose={handleCloseQuickTasks} />
        </FloatingSheet>
      )}

      {/* Quick Chat Overlay */}
      {isQuickChatOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={handleCloseQuickChat}
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
          <QuickChatSheet onClose={handleCloseQuickChat} />
        </FloatingSheet>
      )}

      {/* Quick Data Overlay */}
      {isQuickDataOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={handleCloseQuickData}
          title="Data Tables"
          position="right"
          width="2xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
          lockScroll={false}
        >
          <QuickDataSheet onClose={handleCloseQuickData} />
        </FloatingSheet>
      )}

      {/* Quick Files Overlay */}
      {isQuickFilesOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={handleCloseQuickFiles}
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
          <QuickFilesSheet onClose={handleCloseQuickFiles} />
        </FloatingSheet>
      )}

      {/* Utilities Hub Overlay */}
      {isQuickUtilitiesOpen && (
        <UtilitiesOverlay isOpen={true} onClose={handleCloseQuickUtilities} />
      )}

      {/* Quick AI Results Overlay */}
      {isQuickAIResultsOpen && (
        <FloatingSheet
          isOpen={true}
          onClose={handleCloseQuickAIResults}
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

      {/* HTML Preview (general overlay — for any component) */}
      {isHtmlPreviewOpen && htmlPreviewData && (
        <HtmlPreviewBridge
          content={htmlPreviewData.content ?? ""}
          messageId={htmlPreviewData.messageId}
          conversationId={htmlPreviewData.conversationId}
          onClose={handleCloseHtmlPreview}
          title={htmlPreviewData.title}
          description={htmlPreviewData.description}
          onSave={htmlPreviewData.onSave}
          showSaveButton={htmlPreviewData.showSaveButton}
        />
      )}

      {/* Full Screen Markdown Editor (general overlay — for any component) */}
      {isFullScreenEditorOpen && fullScreenEditorData && (
        <FullScreenMarkdownEditorChat
          isOpen={true}
          initialContent={fullScreenEditorData.content ?? ""}
          onSave={(newContent: string) => {
            fullScreenEditorData.onSave?.(newContent);
            handleCloseFullScreenEditor();
          }}
          onCancel={handleCloseFullScreenEditor}
          tabs={fullScreenEditorData.tabs}
          initialTab={fullScreenEditorData.initialTab}
          analysisData={fullScreenEditorData.analysisData}
          messageId={fullScreenEditorData.messageId}
          title={fullScreenEditorData.title}
          showSaveButton={fullScreenEditorData.showSaveButton}
          showCopyButton={fullScreenEditorData.showCopyButton}
        />
      )}

      {/* User Preferences Modal */}
      {isPreferencesOpen && (
        <VSCodePreferencesModal
          isOpen={true}
          onClose={handleClosePreferences}
          initialTab={preferencesData?.initialTab}
        />
      )}

      {/* Announcements Viewer */}
      {isAnnouncementsOpen && (
        <AnnouncementsViewer isOpen={true} onClose={handleCloseAnnouncements} />
      )}

      {/* ========== CONSOLIDATED MESSAGE ACTION OVERLAYS ========== */}

      {/* Save to Notes — wraps QuickSaveModal in NotesProvider */}
      {isSaveToNotesOpen && saveToNotesData && (
        <QuickSaveModalWithProvider
          open={true}
          onOpenChange={(open) => {
            if (!open) handleCloseSaveToNotes();
          }}
          initialContent={
            (saveToNotesData as { content: string; defaultFolder?: string })
              .content
          }
          defaultFolder={
            (saveToNotesData as { content: string; defaultFolder?: string })
              .defaultFolder ?? "Scratch"
          }
          onSaved={handleCloseSaveToNotes}
        />
      )}

      {/* Email Dialog — fetch logic lives here, reads content from overlay data */}
      {isEmailDialogOpen && emailDialogData && (
        <EmailInputDialog
          isOpen={true}
          onClose={handleCloseEmailDialog}
          onSubmit={async (email: string) => {
            const data = emailDialogData as {
              content: string;
              metadata?: Record<string, unknown> | null;
            };
            const response = await fetch("/api/chat/email-response", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                content: data.content,
                metadata: {
                  ...(data.metadata ?? {}),
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
            handleCloseEmailDialog();
          }}
        />
      )}

      {/* Auth Gate — handles Dialog/Drawer split internally via useIsMobile() */}
      {isAuthGateOpen && (
        <AuthGateDialog
          isOpen={true}
          onClose={handleCloseAuthGate}
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

      {/* Content History — reads history from Redux internally */}
      {isContentHistoryOpen &&
        (
          contentHistoryData as {
            sessionId?: string;
            messageId?: string;
          } | null
        )?.sessionId &&
        (
          contentHistoryData as {
            sessionId?: string;
            messageId?: string;
          } | null
        )?.messageId && (
          <ContentHistoryViewer
            isOpen={true}
            onClose={handleCloseContentHistory}
            sessionId={
              (contentHistoryData as { sessionId: string; messageId: string })
                .sessionId
            }
            messageId={
              (contentHistoryData as { sessionId: string; messageId: string })
                .messageId
            }
          />
        )}

      {/* Feedback Dialog — renders its own fixed overlay, zero Redux dependency */}
      {isFeedbackDialogOpen && (
        <FeedbackDialog onClose={handleCloseFeedbackDialog} />
      )}

      {/* Share Modal — passes resource data from overlay state, keeps useSharing internally */}
      {isShareModalOpen && shareModalData && (
        <ShareModal
          isOpen={true}
          onClose={handleCloseShareModal}
          resourceType={
            (
              shareModalData as {
                resourceType: string;
                resourceId: string;
                resourceName: string;
                isOwner: boolean;
              }
            ).resourceType as import("@/utils/permissions").ResourceType
          }
          resourceId={
            (
              shareModalData as {
                resourceType: string;
                resourceId: string;
                resourceName: string;
                isOwner: boolean;
              }
            ).resourceId
          }
          resourceName={
            (
              shareModalData as {
                resourceType: string;
                resourceId: string;
                resourceName: string;
                isOwner: boolean;
              }
            ).resourceName
          }
          isOwner={
            (
              shareModalData as {
                resourceType: string;
                resourceId: string;
                resourceName: string;
                isOwner: boolean;
              }
            ).isOwner
          }
        />
      )}

      {/* ========== PROMPT RESULT DISPLAYS ========== */}

      {/* Pre-Execution Input Modal - Collects variables before execution */}
      <PreExecutionInputModalContainer />

      {/* Modal Full - Requires runId to be initialized in Redux */}
      {isPromptModalOpen && promptModalConfig?.runId && (
        <PromptRunnerModal
          isOpen={true}
          onClose={handleClosePromptModal}
          runId={promptModalConfig.runId}
          title={promptModalConfig.title}
          onExecutionComplete={promptModalConfig.onExecutionComplete}
        />
      )}

      {/* Modal Compact - Gold Standard: Only runId needed */}
      {isCompactModalOpen && compactModalRunId && (
        <PromptCompactModal
          isOpen={true}
          onClose={handleCloseCompactModal}
          runId={compactModalRunId}
        />
      )}

      {/* Inline Overlay */}
      {isInlineOverlayOpen && inlineOverlayData && (
        <PromptInlineOverlay
          isOpen={true}
          onClose={handleCloseInlineOverlay}
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

      {/* Sidebar Result - Requires runId to be initialized in Redux */}
      {isSidebarResultOpen &&
        (sidebarResultRunId || sidebarResultConfig?.runId) && (
          <PromptSidebarRunner
            isOpen={true}
            onClose={handleCloseSidebarResult}
            runId={sidebarResultRunId || sidebarResultConfig?.runId || ""}
            position={sidebarPosition}
            size={sidebarSize}
            title={sidebarResultConfig?.title}
          />
        )}

      {/* Flexible Panel - Requires runId to be initialized in Redux */}
      {isFlexiblePanelOpen &&
        (flexiblePanelRunId || flexiblePanelConfig?.runId) && (
          <PromptFlexiblePanel
            isOpen={true}
            onClose={handleCloseFlexiblePanel}
            runId={flexiblePanelRunId || flexiblePanelConfig?.runId || ""}
            position={flexiblePanelPosition}
            title={flexiblePanelConfig?.title}
          />
        )}

      {/* Toast Queue */}
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            bottom: `${16 + index * 100}px`, // Stack toasts 100px apart
            right: "16px",
            zIndex: 200 + index, // Higher z-index for newer toasts
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
            onDismiss={handleDismissToast}
          />
        </div>
      ))}
    </>
  );
};

export default OverlayController;
