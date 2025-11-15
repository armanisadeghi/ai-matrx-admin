"use client";
import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, selectIsOverlayOpen, selectOverlayData } from "@/lib/redux/slices/overlaySlice";
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
    </>
  );
};

export default OverlayController; 