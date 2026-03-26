/**
 * SpeakerButtonCore — Variant 1: Single play/pause toggle
 *
 * Dynamically imported by SpeakerButton.
 * Uses Volume2TapButton / PauseTapButton from the tap-buttons system.
 * Shape never changes — one button, always.
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Volume2TapButton, PauseTapButton } from '@/components/icons/tap-buttons';
import { useCartesiaSpeaker } from '../hooks/useCartesiaSpeaker';

export interface SpeakerButtonCoreProps {
  text: string;
  processMarkdown?: boolean;
  autoStart?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function SpeakerButtonCore({
  text,
  processMarkdown = true,
  autoStart = false,
  className,
  disabled = false,
}: SpeakerButtonCoreProps) {
  const { isLoading, isPlaying, isPaused, speak, pause, resume } =
    useCartesiaSpeaker({ processMarkdown });

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
        onClick={handleClick}
        disabled={disabled}
        ariaLabel="Pause"
        className={className}
      />
    );
  }

  return (
    <Volume2TapButton
      onClick={handleClick}
      disabled={disabled || isLoading}
      ariaLabel={isLoading ? 'Connecting…' : isPaused ? 'Resume' : 'Play audio'}
      className={className}
    />
  );
}
