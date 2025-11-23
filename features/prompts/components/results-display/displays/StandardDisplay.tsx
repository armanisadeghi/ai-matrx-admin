"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PanelRightOpen, PanelRightClose, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdaptiveLayout } from "@/components/layout/adaptive-layout/AdaptiveLayout";
import { ConversationWithInput } from "@/features/prompts/components/conversation";
import type { PromptRunnerDisplayProps } from "../PromptRunner.types";

// Dynamically import CanvasRenderer to avoid SSR issues
const CanvasRenderer = dynamic(
    () => import("@/components/layout/adaptive-layout/CanvasRenderer").then(mod => ({ default: mod.CanvasRenderer })),
    { ssr: false }
);

/**
 * StandardDisplay - Default PromptRunner display variant
 * 
 * This is the original/current rendering with:
 * - Header with title and canvas toggle
 * - AdaptiveLayout with conversation
 * - Mobile full-screen canvas view
 * - All standard features
 */
export function StandardDisplay({
  title,
  className,
  promptName,
  displayMessages,
  isExecutingPrompt,
  conversationStarted,
  variableDefaults,
  shouldShowVariables,
  expandedVariable,
  onVariableValueChange,
  onExpandedVariableChange,
  chatInput,
  onChatInputChange,
  onSendMessage,
  resources,
  onResourcesChange,
  templateMessages,
  canvasControl,
  mobileCanvasControl,
  autoRun,
  allowChat,
  hideInput,
}: PromptRunnerDisplayProps) {
  const { isCanvasOpen, canvasContent, closeCanvas, openCanvas } = canvasControl;
  const { isMobile, showCanvasOnMobile, setShowCanvasOnMobile } = mobileCanvasControl;

  const handleCanvasToggle = () => {
    if (isMobile) {
      if (isCanvasOpen) {
        setShowCanvasOnMobile(!showCanvasOnMobile);
      } else {
        setShowCanvasOnMobile(true);
      }
    } else {
      // Desktop - toggle the canvas open/close state
      if (isCanvasOpen) {
        closeCanvas();
      } else {
        // Reopen the canvas with the last content
        if (canvasContent) {
          openCanvas(canvasContent);
        }
      }
    }
  };

  // Mobile Canvas Full Screen View
  if (isMobile && showCanvasOnMobile && isCanvasOpen) {
    return (
      <div className={`h-full flex flex-col bg-textured ${className || ''}`}>
        {/* Canvas Header */}
        <div className="flex-none flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Canvas
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCanvasOnMobile(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Canvas Content */}
        <div className="flex-1 overflow-hidden">
          <CanvasRenderer content={canvasContent} variant="compact" />
        </div>
      </div>
    );
  }

  // Standard Desktop/Mobile View
  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <h2 className="text-base font-semibold text-foreground truncate flex-1">
          {title || promptName || "Run Prompt"}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0 pr-8">
          {/* Only show canvas toggle if canvas has content */}
          {canvasContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCanvasToggle}
              className="h-8 w-8 p-0"
              title={isMobile && showCanvasOnMobile ? "Back to conversation" : isCanvasOpen ? "Close canvas" : "Open canvas"}
            >
              {isMobile && showCanvasOnMobile ? (
                <X className="w-4 h-4" />
              ) : isCanvasOpen ? (
                <PanelRightClose className="w-5 h-5" />
              ) : (
                <PanelRightOpen className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Main content with AdaptiveLayout */}
      <div className="flex-1 overflow-hidden relative">
        <AdaptiveLayout
          className="h-full bg-textured"
          disableAutoCanvas={isMobile}
          rightPanel={
            <ConversationWithInput
              messages={displayMessages}
              isStreaming={isExecutingPrompt}
              emptyState={
                isExecutingPrompt ? (
                  <div className="flex items-start px-6 py-8">
                    <span className="text-sm text-muted-foreground animate-[fadeInOut_2s_ease-in-out_infinite]">
                      Thinking...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground px-6">
                    <div className="text-center max-w-2xl">
                      <p className="text-lg font-medium mb-2">
                        Ready to run your prompt
                      </p>
                      <p className="text-sm">
                        {variableDefaults.length > 0 
                          ? shouldShowVariables 
                            ? "Fill in the variables below and send your message"
                            : "Type your message to continue"
                          : "Type your message below to get started"}
                      </p>
                    </div>
                  </div>
                )
              }
              variableDefaults={variableDefaults}
              onVariableValueChange={onVariableValueChange}
              expandedVariable={expandedVariable}
              onExpandedVariableChange={onExpandedVariableChange}
              chatInput={chatInput}
              onChatInputChange={onChatInputChange}
              onSendMessage={onSendMessage}
              showVariables={shouldShowVariables}
              templateMessages={templateMessages}
              resources={resources}
              onResourcesChange={onResourcesChange}
              enablePasteImages={true}
              hideInput={hideInput}
            />
          }
        />
      </div>
    </div>
  );
}

