/**
 * SpeakerButton — Variant 1: Single play/pause toggle
 *
 * Thin shell. Renders a single Volume2TapButton.
 * On first click, lazily loads SpeakerButtonCore.
 * Shape never changes — always one button.
 */

'use client';

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Volume2TapButton } from '@/components/icons/tap-buttons';

export interface SpeakerButtonProps {
  text: string;
  processMarkdown?: boolean;
  className?: string;
  disabled?: boolean;
}

const SpeakerButtonCore = lazy(() => import('./SpeakerButtonCore'));

export function SpeakerButton({
  text,
  processMarkdown = true,
  className,
  disabled = false,
}: SpeakerButtonProps) {
  const [engaged, setEngaged] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled && text.trim()) setEngaged(true);
  }, [disabled, text]);

  if (!engaged) {
    return (
      <Volume2TapButton
        onClick={handleClick}
        disabled={disabled || !text.trim()}
        ariaLabel="Play audio"
        className={className}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <Volume2TapButton disabled ariaLabel="Loading…" className={className} />
      }
    >
      <SpeakerButtonCore
        text={text}
        processMarkdown={processMarkdown}
        className={className}
        disabled={disabled}
        autoStart
      />
    </Suspense>
  );
}
