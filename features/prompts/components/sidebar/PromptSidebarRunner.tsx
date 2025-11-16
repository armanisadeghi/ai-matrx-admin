"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import type { PromptData } from '../../types/modal';
import type { PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';

const FloatingSheet = dynamic(
  () => import('@/components/ui/matrx/FloatingSheet'),
  { ssr: false }
);

const PromptRunner = dynamic(
  () => import('../modal/PromptRunner').then(mod => ({ default: mod.PromptRunner })),
  { ssr: false }
);

interface PromptSidebarRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  promptId?: string;
  promptData?: PromptData;
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  variables?: Record<string, string>;
  title?: string;
}

/**
 * PromptSidebarRunner - Renders PromptRunner in a FloatingSheet sidebar
 * 
 * Features:
 * - Wraps PromptRunner in our existing FloatingSheet component
 * - Supports left/right positioning
 * - Adjustable sizes (sm, md, lg)
 * - Full prompt execution capabilities
 * - Optional push-content mode (future)
 */
export default function PromptSidebarRunner({
  isOpen,
  onClose,
  position = 'right',
  size = 'lg',
  promptId,
  promptData,
  executionConfig,
  variables,
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
        promptId={promptId}
        promptData={promptData}
        executionConfig={executionConfig}
        variables={variables}
        title={title}
        onClose={onClose}
        isActive={isOpen}
      />
    </FloatingSheet>
  );
}

