"use client";

import React from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import { PromptRunner } from "./PromptRunner";
import type { PromptData } from '@/features/prompts/types/core';
import { PromptExecutionConfig } from "@/features/prompt-builtins/types/execution-modes";

interface PromptFlexiblePanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  promptId?: string;
  promptData: PromptData;
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  runId?: string;
  onExecutionComplete?: (result: { runId: string; response: string; metadata: any }) => void;
  customMessage?: string;
}

/**
 * PromptFlexiblePanel - Displays the PromptRunner component within a MatrxDynamicPanel.
 *
 * Features:
 * - Supports all 4 positions (left, right, top, bottom)
 * - Fully resizable with drag handles
 * - Fullscreen mode toggle
 * - User can change position dynamically
 * - Full prompt execution capabilities
 */
export default function PromptFlexiblePanel({
  isOpen,
  onClose,
  position = 'right',
  promptId,
  promptData,
  executionConfig,
  variables,
  initialMessage,
  title,
  runId,
  onExecutionComplete,
  customMessage,
}: PromptFlexiblePanelProps) {
  if (!isOpen) return null;

  return (
    <MatrxDynamicPanel
      initialPosition={position}
      defaultExpanded={true}
      isExpanded={isOpen}
      onExpandedChange={(expanded) => {
        if (!expanded) {
          onClose();
        }
      }}
      defaultSize={35}
      minSize={15}
      maxSize={85}
      header={
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">
            {title || promptData?.name || 'AI Prompt'}
          </h2>
        </div>
      }
    >
      <PromptRunner
        promptId={promptId}
        promptData={promptData}
        executionConfig={executionConfig}
        variables={variables}
        initialMessage={initialMessage}
        onExecutionComplete={onExecutionComplete}
        title={title}
        runId={runId}
        onClose={onClose}
        isActive={isOpen}
        customMessage={customMessage}
      />
    </MatrxDynamicPanel>
  );
}

