"use client";

import React from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import { PromptRunner } from "./PromptRunner";

interface PromptFlexiblePanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
  /** Required: The run ID - instance must exist in Redux */
  runId: string;
  /** Panel position */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Optional title */
  title?: string;
  /** Callback when execution completes */
  onExecutionComplete?: (result: { runId: string; response: string; metadata: any }) => void;
}

/**
 * PromptFlexiblePanel - Displays the PromptRunner component within a MatrxDynamicPanel.
 *
 * IMPORTANT: Caller must initialize the run via startPromptInstance or loadRun
 * BEFORE opening this panel. The runId must exist in Redux.
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
  runId,
  position = 'right',
  title,
  onExecutionComplete,
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
            {title || 'AI Prompt'}
          </h2>
        </div>
      }
    >
      <PromptRunner
        runId={runId}
        title={title}
        onClose={onClose}
        onExecutionComplete={onExecutionComplete}
      />
    </MatrxDynamicPanel>
  );
}

