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
import dynamic from "next/dynamic";
import type { ResourceType } from "@/utils/permissions";
import { updateOverlayData } from "@/lib/redux/slices/overlayDataSlice";

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

// QuickNotesSheet requires NotesProvider — wrap it so it works outside the notes page
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
  () => import("@/features/ssr-trials/components/FeedbackDialog"),
  { ssr: false },
);

const ShareModal = dynamic(
  () =>
    import("@/features/sharing/components/ShareModal").then((m) => ({
      default: m.ShareModal,
    })),
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
  () => import("@/features/prompts/components/toast/PromptToast"),
  { ssr: false },
);

const PreExecutionInputModalContainer = dynamic(
  () =>
    import("@/features/prompts/components/modals/PreExecutionInputModalContainer").then(
      (mod) => ({ default: mod.PreExecutionInputModalContainer }),
    ),
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

  // ── Instanced overlay selectors — returns all open instances ────────────
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
    <>
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

      {isFeedbackDialogOpen && (
        <FeedbackDialog onClose={() => close("feedbackDialog")} />
      )}

      {/* ── Instanced overlays — .map() renders each open instance ─────── */}
      {/* Each instance gets a stable key so React correctly reconciles them. */}

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

      {/* Save to Notes — instanced so multiple saves can be open at once */}
      {saveToNotesInstances.map(({ instanceId, data }) => {
        const d = data as { content: string; defaultFolder?: string } | null;
        if (!d) return null;
        return (
          <QuickSaveModalWithProvider
            key={instanceId}
            open={true}
            onOpenChange={(open: boolean) => {
              if (!open) close("saveToNotes", instanceId);
            }}
            initialContent={d.content}
            defaultFolder={d.defaultFolder ?? "Scratch"}
            onSaved={() => close("saveToNotes", instanceId)}
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
    </>
  );
};

export default OverlayController;
