"use client";

import React, { useEffect } from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import { PromptRunner } from "./PromptRunner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * - Can be collapsed to button state without closing
 */
export default function PromptFlexiblePanel({
  isOpen,
  onClose,
  runId,
  position = 'right',
  title,
  onExecutionComplete,
}: PromptFlexiblePanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsExpanded(true);
    }
  }, [runId, isOpen]);

  if (!isOpen) return null;

  return (
    <MatrxDynamicPanel
      initialPosition={position}
      defaultExpanded={true}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      defaultSize={35}
      minSize={15}
      maxSize={85}
      expandButtonProps={{
        label: title || 'AI Prompt',
      }}
      header={
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">
            {title || 'AI Prompt'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 px-2 ml-auto"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      }
    >
      <PromptRunner
        runId={runId}
        onClose={onClose}
        onExecutionComplete={onExecutionComplete}
      />
    </MatrxDynamicPanel>
  );
}

