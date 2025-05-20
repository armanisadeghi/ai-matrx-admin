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
    </>
  );
};

export default OverlayController; 