"use client";

import React from 'react';
import dynamic from 'next/dynamic';

const FloatingSheet = dynamic(
  () => import('@/components/official/FloatingSheet'),
  { ssr: false }
);

const PromptRunner = dynamic(
  () => import('./PromptRunner').then(mod => ({ default: mod.PromptRunner })),
  { ssr: false }
);

interface PromptSidebarRunnerProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback when sidebar closes */
  onClose: () => void;
  /** Required: The run ID - instance must exist in Redux */
  runId: string;
  /** Sidebar position */
  position?: 'left' | 'right';
  /** Sidebar size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional title */
  title?: string;
}

/**
 * PromptSidebarRunner - Renders PromptRunner in a FloatingSheet sidebar
 * 
 * IMPORTANT: Caller must initialize the run via startPromptInstance or loadRun
 * BEFORE opening this sidebar. The runId must exist in Redux.
 * 
 * Features:
 * - Wraps PromptRunner in our existing FloatingSheet component
 * - Supports left/right positioning
 * - Adjustable sizes (sm, md, lg)
 * - Full prompt execution capabilities
 */
export default function PromptSidebarRunner({
  isOpen,
  onClose,
  runId,
  position = 'right',
  size = 'lg',
  title,
}: PromptSidebarRunnerProps) {
  // Map size to FloatingSheet width
  const widthMap = {
    sm: 'md' as const,
    md: 'lg' as const,
    lg: 'xl' as const,
  };

  return (
    <FloatingSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'AI Prompt'}
      position={position}
      width={widthMap[size]}
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
    >
      <PromptRunner
        runId={runId}
        title={title}
        onClose={onClose}
      />
    </FloatingSheet>
  );
}

