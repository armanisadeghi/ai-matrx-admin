/**
 * StreamingSpeakerButton — Single play/pause toggle, streaming variant
 *
 * Thin shell. Before first click, renders JUST a Volume2TapButton — no hook,
 * no SDK, zero bundle cost. On first click, lazily loads
 * StreamingSpeakerButtonCore (which pulls the streaming hook and the Cartesia
 * SDK in a single code-split chunk), and the core auto-starts playback.
 *
 * API identical to SpeakerButton for drop-in compatibility. The only change
 * is the underlying hook streams chunked text via contextId + ws.continue
 * instead of sending one big transcript.
 */

'use client';

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Volume2TapButton } from '@/components/icons/tap-buttons';
import type { SpeakerVariant } from '../types';

export interface StreamingSpeakerButtonProps {
  text: string;
  processMarkdown?: boolean;
  variant?: SpeakerVariant;
  className?: string;
  disabled?: boolean;
}

const StreamingSpeakerButtonCore = lazy(
  () => import('./StreamingSpeakerButtonCore'),
);

export function StreamingSpeakerButton({
  text,
  processMarkdown = true,
  variant,
  className,
  disabled = false,
}: StreamingSpeakerButtonProps) {
  const [engaged, setEngaged] = useState(false);

  const handleClick = useCallback(() => {
    if (!disabled && text.trim()) setEngaged(true);
  }, [disabled, text]);

  if (!engaged) {
    return (
      <Volume2TapButton
        variant={variant}
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
        <Volume2TapButton
          variant={variant}
          disabled
          ariaLabel="Loading…"
          className={className}
        />
      }
    >
      <StreamingSpeakerButtonCore
        text={text}
        processMarkdown={processMarkdown}
        variant={variant}
        className={className}
        disabled={disabled}
        autoStart
      />
    </Suspense>
  );
}
