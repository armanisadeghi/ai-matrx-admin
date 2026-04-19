/**
 * StreamingSpeakerButtonCore — single play/pause toggle (dynamically imported)
 *
 * Same shape and UX as SpeakerButtonCore, but uses useCartesiaStreamingSpeaker
 * under the hood so the first audio byte arrives ~200-300ms after click even
 * for multi-paragraph inputs.
 *
 * This file imports the Cartesia SDK transitively via the streaming hook.
 * Consumers must load this module behind React.lazy / next/dynamic so the
 * SDK is NOT pulled into the initial bundle.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Volume2TapButton, PauseTapButton } from '@/components/icons/tap-buttons';
import { useCartesiaStreamingSpeaker } from '../hooks/useCartesiaStreamingSpeaker';
import type { SpeakerVariant } from '../types';

export interface StreamingSpeakerButtonCoreProps {
  text: string;
  processMarkdown?: boolean;
  autoStart?: boolean;
  variant?: SpeakerVariant;
  className?: string;
  disabled?: boolean;
}

export default function StreamingSpeakerButtonCore({
  text,
  processMarkdown = true,
  autoStart = false,
  variant,
  className,
  disabled = false,
}: StreamingSpeakerButtonCoreProps) {
  const { isLoading, isPlaying, isPaused, speak, pause, resume } =
    useCartesiaStreamingSpeaker({ processMarkdown });

  const autoStartFired = useRef(false);

  useEffect(() => {
    if (!autoStart || autoStartFired.current) return;
    autoStartFired.current = true;
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;
    if (isPlaying) await pause();
    else if (isPaused) await resume();
    else await speak(text);
  }, [disabled, isLoading, isPlaying, isPaused, text, speak, pause, resume]);

  if (isPlaying) {
    return (
      <PauseTapButton
        variant={variant}
        onClick={handleClick}
        disabled={disabled}
        ariaLabel="Pause"
        className={className}
      />
    );
  }

  return (
    <Volume2TapButton
      variant={variant}
      onClick={handleClick}
      disabled={disabled || isLoading}
      ariaLabel={isLoading ? 'Connecting…' : isPaused ? 'Resume' : 'Play audio'}
      className={className}
    />
  );
}
