"use client";
import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, selectIsOverlayOpen, selectOverlayData } from "@/lib/redux/slices/overlaySlice";
import { 
  closePromptModal, 
  selectIsPromptModalOpen, 
  selectPromptModalConfig,
  closeCompactModal,
  selectIsCompactModalOpen,
  selectCompactModalConfig,
  closeInlineOverlay,
  selectIsInlineOverlayOpen,
  selectInlineOverlayData,
  closeSidebarResult,
  selectIsSidebarResultOpen,
  selectSidebarResultConfig,
  selectSidebarPosition,
  selectSidebarSize,
  selectToastQueue,
  removeToast,
} from "@/lib/redux/slices/promptRunnerSlice";
import dynamic from "next/dynamic";

// Dynamically import the components with ssr: false to prevent them from loading on the server
const FullscreenMarkdownEditor = dynamic(
  () => import("@/components/mardown-display/markdown-classification/FullscreenMarkdownEditor"),
  { ssr: false }
);

const FullscreenSocketAccordion = dynamic(
  () => import("@/components/socket/response/FullscreenSocketAccordion"),
  { ssr: false }
);

const FullscreenBrokerState = dynamic(
  () => import("@/features/applet/runner/response/FullscreenBrokerState"),
  { ssr: false }
);

// Quick Action Sheets
const QuickNotesSheet = dynamic(
  () => import("@/features/notes/components/QuickNotesSheet").then(mod => ({ default: mod.QuickNotesSheet })),
  { ssr: false }
);

const QuickTasksSheet = dynamic(
  () => import("@/features/tasks/components/QuickTasksSheet").then(mod => ({ default: mod.QuickTasksSheet })),
  { ssr: false }
);

const QuickChatSheet = dynamic(
  () => import("@/features/quick-actions/components/QuickChatSheet").then(mod => ({ default: mod.QuickChatSheet })),
  { ssr: false }
);

const QuickDataSheet = dynamic(
  () => import("@/features/quick-actions/components/QuickDataSheet").then(mod => ({ default: mod.QuickDataSheet })),
  { ssr: false }
);

const QuickFilesSheet = dynamic(
  () => import("@/features/quick-actions/components/QuickFilesSheet").then(mod => ({ default: mod.QuickFilesSheet })),
  { ssr: false }
);

const UtilitiesOverlay = dynamic(
  () => import("@/features/quick-actions/components/UtilitiesOverlay").then(mod => ({ default: mod.UtilitiesOverlay })),
  { ssr: false }
);

const FloatingSheet = dynamic(
  () => import("@/components/ui/matrx/FloatingSheet"),
  { ssr: false }
);

// Prompt Runner Modal (modal-full)
const PromptRunnerModal = dynamic(
  () => import("@/features/prompts/components/modal/PromptRunnerModal").then(mod => ({ default: mod.PromptRunnerModal })),
  { ssr: false }
);

// Prompt Compact Modal (modal-compact)
const PromptCompactModal = dynamic(
  () => import("@/features/prompts/components/modal/PromptCompactModal"),
  { ssr: false }
);

// Prompt Inline Overlay (inline)
const PromptInlineOverlay = dynamic(
  () => import("@/features/prompts/components/inline/PromptInlineOverlay"),
  { ssr: false }
);

// Prompt Sidebar Runner (sidebar)
const PromptSidebarRunner = dynamic(
  () => import("@/features/prompts/components/sidebar/PromptSidebarRunner"),
  { ssr: false }
);

// Prompt Toast (toast)
const PromptToast = dynamic(
  () => import("@/features/prompts/components/toast/PromptToast"),
  { ssr: false }
);

/**
 * OverlayController component renders different overlays based on redux state
 */
export const OverlayController: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isMounted, setIsMounted] = useState(false);

  // Check if each overlay is open
  const isMarkdownEditorOpen = useAppSelector((state) => selectIsOverlayOpen(state, "markdownEditor"));
  const isSocketAccordionOpen = useAppSelector((state) => selectIsOverlayOpen(state, "socketAccordion"));
  const isBrokerStateOpen = useAppSelector((state) => selectIsOverlayOpen(state, "brokerState"));
  
  // Quick Action overlays
  const isQuickNotesOpen = useAppSelector((state) => selectIsOverlayOpen(state, "quickNotes"));
  const isQuickTasksOpen = useAppSelector((state) => selectIsOverlayOpen(state, "quickTasks"));
  const isQuickChatOpen = useAppSelector((state) => selectIsOverlayOpen(state, "quickChat"));
  const isQuickDataOpen = useAppSelector((state) => selectIsOverlayOpen(state, "quickData"));
  const isQuickFilesOpen = useAppSelector((state) => selectIsOverlayOpen(state, "quickFiles"));
  const isQuickUtilitiesOpen = useAppSelector((state) => selectIsOverlayOpen(state, "quickUtilities"));
  
  // Prompt Runner Modals
  const isPromptModalOpen = useAppSelector(selectIsPromptModalOpen);
  const promptModalConfig = useAppSelector(selectPromptModalConfig);
  
  const isCompactModalOpen = useAppSelector(selectIsCompactModalOpen);
  const compactModalConfig = useAppSelector(selectCompactModalConfig);
  const compactModalTaskId = useAppSelector((state) => state.promptRunner?.compactModal?.taskId || null);
  
  const isInlineOverlayOpen = useAppSelector(selectIsInlineOverlayOpen);
  const inlineOverlayData = useAppSelector(selectInlineOverlayData);
  
  const isSidebarResultOpen = useAppSelector(selectIsSidebarResultOpen);
  const sidebarResultConfig = useAppSelector(selectSidebarResultConfig);
  const sidebarPosition = useAppSelector(selectSidebarPosition);
  const sidebarSize = useAppSelector(selectSidebarSize);
  
  const toastQueue = useAppSelector(selectToastQueue);
  
  // Get data for each overlay
  const markdownEditorData = useAppSelector((state) => selectOverlayData(state, "markdownEditor"));
  const socketAccordionData = useAppSelector((state) => selectOverlayData(state, "socketAccordion"));

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

  // Prompt Runner handlers
  const handleClosePromptModal = () => {
    dispatch(closePromptModal());
  };
  
  const handleCloseCompactModal = () => {
    dispatch(closeCompactModal());
  };
  
  const handleCloseInlineOverlay = () => {
    dispatch(closeInlineOverlay());
  };
  
  const handleCloseSidebarResult = () => {
    dispatch(closeSidebarResult());
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
          width="xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
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
          width="xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
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
          width="xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={false}
          contentClassName="p-0"
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
          width="xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={true}
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
          width="xl"
          height="full"
          closeOnBackdropClick={true}
          closeOnEsc={true}
          showCloseButton={false}
          contentClassName="p-0"
        >
          <QuickFilesSheet onClose={handleCloseQuickFiles} />
        </FloatingSheet>
      )}

      {/* Utilities Hub Overlay */}
      {isQuickUtilitiesOpen && (
        <UtilitiesOverlay
          isOpen={true}
          onClose={handleCloseQuickUtilities}
        />
      )}

      {/* ========== PROMPT RESULT DISPLAYS ========== */}
      
      {/* Modal Full */}
      {isPromptModalOpen && promptModalConfig && (
        <PromptRunnerModal
          isOpen={true}
          onClose={handleClosePromptModal}
          promptId={promptModalConfig.promptId}
          promptData={promptModalConfig.promptData}
          executionConfig={promptModalConfig.executionConfig}
          mode={promptModalConfig.mode}
          variables={promptModalConfig.variables}
          initialMessage={promptModalConfig.initialMessage}
          title={promptModalConfig.title}
          runId={promptModalConfig.runId}
          onExecutionComplete={promptModalConfig.onExecutionComplete}
        />
      )}
      
      {/* Modal Compact */}
      {isCompactModalOpen && compactModalConfig && (
        <PromptCompactModal
          isOpen={true}
          onClose={handleCloseCompactModal}
          promptId={compactModalConfig.promptId}
          promptData={compactModalConfig.promptData}
          executionConfig={compactModalConfig.executionConfig}
          variables={compactModalConfig.variables}
          title={compactModalConfig.title}
          preloadedResult={(compactModalConfig as any).preloadedResult}
          taskId={compactModalTaskId || undefined}
        />
      )}
      
      {/* Inline Overlay */}
      {isInlineOverlayOpen && inlineOverlayData && (
        <PromptInlineOverlay
          isOpen={true}
          onClose={handleCloseInlineOverlay}
          result={inlineOverlayData.result || ''}
          originalText={inlineOverlayData.originalText || ''}
          promptName={inlineOverlayData.promptName || ''}
          taskId={inlineOverlayData.taskId || undefined}
          isStreaming={inlineOverlayData.isStreaming}
          onReplace={inlineOverlayData.callbacks?.onReplace}
          onInsertBefore={inlineOverlayData.callbacks?.onInsertBefore}
          onInsertAfter={inlineOverlayData.callbacks?.onInsertAfter}
        />
      )}
      
      {/* Sidebar Result */}
      {isSidebarResultOpen && sidebarResultConfig && (
        <PromptSidebarRunner
          isOpen={true}
          onClose={handleCloseSidebarResult}
          position={sidebarPosition}
          size={sidebarSize}
          promptId={sidebarResultConfig.promptId}
          promptData={sidebarResultConfig.promptData}
          executionConfig={sidebarResultConfig.executionConfig}
          variables={sidebarResultConfig.variables}
          title={sidebarResultConfig.title}
        />
      )}
      
      {/* Toast Queue */}
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            bottom: `${16 + (index * 100)}px`, // Stack toasts 100px apart
            right: '16px',
            zIndex: 200 + index, // Higher z-index for newer toasts
          }}
        >
          <PromptToast
            toastId={toast.id}
            result={toast.result}
            promptName={toast.promptName || ''}
            promptData={toast.promptData}
            executionConfig={toast.executionConfig}
            taskId={toast.taskId}
            onDismiss={handleDismissToast}
          />
        </div>
      ))}
    </>
  );
};

export default OverlayController; 